import { useFocusEffect, useRoute } from '@react-navigation/native';
import React, { useContext } from 'react';
import {
	StyleSheet,
	Text,
	View,
	ToastAndroid,
	ScrollView,
	Image,
	TouchableOpacity,
} from 'react-native';
import { InputComponent } from '../../components';
// import { PrinterBanner } from '../../components';
import { Button } from 'react-native-elements/dist/buttons/Button';
import { Icon } from 'react-native-elements';
import { COLORS, FONTS } from '../../constants';
import api from '../../api/services';
import { getApiErrorMessage } from '../../api/errors';
import AuthContext from '../../auth/Context';
import { formatPlateForDisplay } from '../../utils/plateNumber';
import {
	captureVehiclePhoto,
	readPlateFromImage,
	scanVehiclePlate,
} from '../../utils/scanPlate';
// import { usePrinter } from '../../printer/PrinterContext';
import {
	// buildExitPrintDetails,
	// buildExitPrintExtras,
	enrichSearchDetails,
	extractParkingDetails,
	getResponseMessage,
	isFailureMessage,
	isValidParkingRecord,
	normalizeParkingRecord,
	// printExitSlip,
} from '../../printer/printSlip';

const Index = () => {
	const [billOrVehicleNumber, setBillOrVehicleNumber] = React.useState('');
	const [vehicleImage, setVehicleImage] = React.useState(null);
	const [plateImage, setPlateImage] = React.useState(null);
	const [capturingVehicle, setCapturingVehicle] = React.useState(false);
	const [scanningPlate, setScanningPlate] = React.useState(false);
	const [buttonLoading, setButtonLoading] = React.useState(false);
	const [printButtonLoading, setPrintButtonLoading] = React.useState(false);
	const [parkingDetails, setParkingDetails] = React.useState(null);

	const route = useRoute();
	const authContext = React.useContext(AuthContext);
	// const { isConnected, printerMessage } = usePrinter();

	function applyReadPlate(plate) {
		if (!plate) {
			ToastAndroid.showWithGravity(
				'Could not read the plate. Crop closer to the number and try again.',
				ToastAndroid.SHORT,
				ToastAndroid.BOTTOM,
			);
			return '';
		}

		setBillOrVehicleNumber(formatPlateForDisplay(plate));
		ToastAndroid.showWithGravity(
			`Vehicle number: ${formatPlateForDisplay(plate)}`,
			ToastAndroid.SHORT,
			ToastAndroid.BOTTOM,
		);
		return plate;
	}

	async function openVehicleCamera() {
		setCapturingVehicle(true);
		try {
			const photo = await captureVehiclePhoto();
			setVehicleImage(photo);
		} catch (error) {
			if (error?.code !== 'E_PICKER_CANCELLED') {
				ToastAndroid.showWithGravity(
					error?.message || 'Failed to capture vehicle photo',
					ToastAndroid.SHORT,
					ToastAndroid.BOTTOM,
				);
			}
		} finally {
			setCapturingVehicle(false);
		}
	}

	async function openPlateCamera() {
		setScanningPlate(true);
		try {
			const scanned = await scanVehiclePlate();
			setPlateImage(scanned);
			const plate = applyReadPlate(scanned.plate);
			if (plate) {
				await searchByPlate(plate);
			}
		} catch (error) {
			if (error?.code !== 'E_PICKER_CANCELLED') {
				ToastAndroid.showWithGravity(
					error?.message || 'Failed to open camera',
					ToastAndroid.SHORT,
					ToastAndroid.BOTTOM,
				);
			}
		} finally {
			setScanningPlate(false);
		}
	}

	async function rereadPlateFromPhoto() {
		if (!plateImage?.path || scanningPlate) {
			return;
		}

		setScanningPlate(true);
		try {
			const plate = applyReadPlate(await readPlateFromImage(plateImage));
			if (plate) {
				await searchByPlate(plate);
			}
		} catch (error) {
			ToastAndroid.showWithGravity(
				error?.message || 'Failed to read plate',
				ToastAndroid.SHORT,
				ToastAndroid.BOTTOM,
			);
		} finally {
			setScanningPlate(false);
		}
	}

	async function checkoutVehicle() {
		const savedDetails = normalizeParkingRecord(parkingDetails);

		if (!isValidParkingRecord(savedDetails)) {
			ToastAndroid.showWithGravity(
				'Record not available',
				ToastAndroid.SHORT,
				ToastAndroid.BOTTOM,
			);
			return;
		}

		setPrintButtonLoading(true);
		try {
			const response = await api.exitVehicle({
				employeeId: authContext?.user?.id,
				parkingId: savedDetails.id,
				plate_number: savedDetails.vehicle_number,
				slip_number: savedDetails.slip_number || savedDetails.bill_number,
				vehicle_image: vehicleImage,
				plate_image: plateImage,
			});

			const responseMessage = getResponseMessage(response);
			const apiDetails = extractParkingDetails(response);
			const hasUpdatedParkingData = isValidParkingRecord(apiDetails);

			if (isFailureMessage(responseMessage) && !hasUpdatedParkingData) {
				ToastAndroid.showWithGravity(
					responseMessage,
					ToastAndroid.SHORT,
					ToastAndroid.BOTTOM,
				);
				return;
			}

			setParkingDetails(null);
			setVehicleImage(null);
			setPlateImage(null);
			setBillOrVehicleNumber('');
			ToastAndroid.showWithGravity(
				!isFailureMessage(responseMessage) && responseMessage
					? responseMessage
					: 'Vehicle checked out',
				ToastAndroid.SHORT,
				ToastAndroid.BOTTOM,
			);
		} catch (err) {
			ToastAndroid.showWithGravity(
				getApiErrorMessage(err, 'Failed to process exit'),
				ToastAndroid.SHORT,
				ToastAndroid.BOTTOM,
			);
		} finally {
			setPrintButtonLoading(false);
		}
	}

	function formatSearchQueryForDisplay(query) {
		const trimmed = String(query || '').trim();
		if (/^\d+$/.test(trimmed)) {
			return trimmed;
		}
		return formatPlateForDisplay(trimmed);
	}

	async function searchByPlate(plateNumber) {
		const query = String(plateNumber || '').trim();
		if (!query) {
			ToastAndroid.showWithGravity(
				'Please enter vehicle number or slip number!',
				ToastAndroid.SHORT,
				ToastAndroid.CENTER,
			);
			return;
		}

		setButtonLoading(true);
		try {
			const response = await api.searchVehicle({
				billOrVehicleNumber: query,
			});
			const details = enrichSearchDetails(response);
			const isParked = response?.data?.data?.is_parked;

			if (details && !details.vehicle_number && !/^\d+$/.test(query)) {
				details.vehicle_number = query;
			}

			if (isParked === false || !isValidParkingRecord(details)) {
				setParkingDetails(null);
				ToastAndroid.showWithGravity(
					getResponseMessage(response) || 'Vehicle is not parked',
					ToastAndroid.SHORT,
					ToastAndroid.BOTTOM,
				);
				return;
			}

			setParkingDetails(details);
			setBillOrVehicleNumber(
				formatSearchQueryForDisplay(
					details?.slip_number || details?.bill_number || details?.vehicle_number || query,
				),
			);
			ToastAndroid.show(
				getResponseMessage(response) || 'Vehicle found',
				ToastAndroid.SHORT,
				ToastAndroid.BOTTOM,
			);
		} catch (err) {
			setParkingDetails(null);
			ToastAndroid.showWithGravity(
				getApiErrorMessage(err, 'Failed to search vehicle'),
				ToastAndroid.SHORT,
				ToastAndroid.BOTTOM,
			);
		} finally {
			setButtonLoading(false);
		}
	}

	async function handleFormSubmit() {
		await searchByPlate(billOrVehicleNumber);
	}

	const plateFromRoute = route.params?.plateNumber;
	const openedAt = route.params?.openedAt;

	useFocusEffect(
		React.useCallback(() => {
			if (!plateFromRoute) {
				return undefined;
			}

			setVehicleImage(null);
			setPlateImage(null);
			setParkingDetails(null);
			setBillOrVehicleNumber(formatPlateForDisplay(plateFromRoute));
			searchByPlate(plateFromRoute);

			return undefined;
		}, [plateFromRoute, openedAt]),
	);

	return (
		<View style={styles.screen}>
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.scrollContent}
			keyboardShouldPersistTaps="never">
			{/* <PrinterBanner /> */}
			<InputComponent
				required={true}
				label="Slip / Vehicle Number"
				leftIcon="bus"
				value={billOrVehicleNumber}
				onChangeText={value => {
					const trimmed = String(value || '').trim();
					setBillOrVehicleNumber(
						/^\d+$/.test(trimmed) ? trimmed : formatPlateForDisplay(value),
					);
				}}
			/>
			<View style={styles.photoRow}>
				<View style={styles.photoColumn}>
					{vehicleImage?.uri ? (
						<View>
							<Text style={styles.photoLabel}>Vehicle photo</Text>
							<TouchableOpacity
								onPress={openVehicleCamera}
								disabled={capturingVehicle}>
								<Image source={{ uri: vehicleImage.uri }} style={styles.previewImage} />
							</TouchableOpacity>
							<TouchableOpacity
								onPress={openVehicleCamera}
								disabled={capturingVehicle}>
								<Text style={styles.photoAction}>
									{capturingVehicle ? 'Opening camera...' : 'Retake'}
								</Text>
							</TouchableOpacity>
						</View>
					) : (
						<TouchableOpacity
							onPress={openVehicleCamera}
							disabled={capturingVehicle}
							style={styles.captureBox}>
							<Icon name="car" type="font-awesome" size={18} color={COLORS.primary} />
							<Text style={styles.captureText}>
								{capturingVehicle ? 'Opening camera...' : 'Take vehicle photo'}
							</Text>
						</TouchableOpacity>
					)}
				</View>
				<View style={[styles.photoColumn, styles.photoColumnRight]}>
					{plateImage?.uri ? (
						<View>
							<Text style={styles.photoLabel}>Number plate</Text>
							<TouchableOpacity
								onPress={openPlateCamera}
								disabled={scanningPlate}>
								<Image source={{ uri: plateImage.uri }} style={styles.previewImage} />
							</TouchableOpacity>
							<View style={styles.photoActions}>
								<TouchableOpacity
									onPress={openPlateCamera}
									disabled={scanningPlate}>
									<Text style={styles.photoAction}>
										{scanningPlate ? 'Opening...' : 'Retake'}
									</Text>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={rereadPlateFromPhoto}
									disabled={scanningPlate}>
									<Text style={styles.photoAction}>Read again</Text>
								</TouchableOpacity>
							</View>
						</View>
					) : (
						<TouchableOpacity
							onPress={openPlateCamera}
							disabled={scanningPlate}
							style={styles.captureBox}>
							<Icon name="camera" type="font-awesome" size={18} color={COLORS.primary} />
							<Text style={styles.captureText}>
								{scanningPlate ? 'Reading plate...' : 'Scan number plate'}
							</Text>
						</TouchableOpacity>
					)}
				</View>
			</View>

			<Button
				title="Search"
				loading={buttonLoading}
				buttonStyle={styles.searchButton}
				onPress={handleFormSubmit}
			/>

			<View style={styles.grayStrip}>
				<View
					style={{
						flexDirection: 'row',
						paddingVertical: 10,
					}}>
					<Text
						style={[
							FONTS.h4,
							{ fontWeight: 'bold', color: COLORS.primary, textAlign: 'center' },
						]}>
						Ticker Details
					</Text>
				</View>
			</View>

			{!parkingDetails ? (
				<View style={styles.tickerContainer}>
					<Text style={styles.receiptHead}>Record Not Available</Text>
				</View>
			) : (
				<>
					<View style={styles.tickerContainer}>
						<Text style={styles.title}>Parking Ticket</Text>

						{(parkingDetails?.slip_number || parkingDetails?.bill_number) ? (
							<View style={styles.row}>
								<Text style={styles.cols}>Slip Number</Text>
								<Text style={styles.cols}>
									{parkingDetails?.slip_number || parkingDetails?.bill_number}
								</Text>
							</View>
						) : null}

						{parkingDetails?.entry_date ? (
							<View style={styles.dateBlock}>
								<Text style={styles.dateLabel}>Entry Date</Text>
								<Text style={styles.dateValue}>{parkingDetails?.entry_date}</Text>
							</View>
						) : null}

						{parkingDetails?.out_date ? (
							<View style={styles.dateBlock}>
								<Text style={styles.dateLabel}>Exit Date</Text>
								<Text style={styles.dateValue}>{parkingDetails?.out_date}</Text>
							</View>
						) : null}

						<View style={styles.row}>
							<Text style={styles.cols}>Days</Text>
							<Text style={styles.cols}>{parkingDetails?.totaldays ?? 1}</Text>
						</View>

						<View style={styles.row}>
							<Text style={styles.cols}>Vehicle Type</Text>
							<Text style={styles.cols}>
								{parkingDetails?.vehicle_type ||
									parkingDetails?.get_vehicle_type_and_fare?.vehicle_type ||
									'—'}
							</Text>
						</View>

						<View style={styles.row}>
							<Text style={styles.cols}>Vehicle Number</Text>
							<Text style={styles.cols}>
								{formatPlateForDisplay(parkingDetails?.vehicle_number)}
							</Text>
						</View>

						<View style={styles.row}>
							<Text style={styles.cols}>Amount</Text>
							<Text style={styles.cols}>{parkingDetails?.amount ?? 0} RS</Text>
						</View>

						<Text style={styles.receiptFooter}>
							* Double the ticket if slip lost
						</Text>
					</View>
				</>
			)}
		</ScrollView>
		{parkingDetails ? (
			<View style={styles.outBar}>
				<Button
					title="Out"
					buttonStyle={styles.printButton}
					loading={printButtonLoading}
					onPress={checkoutVehicle}
				/>
			</View>
		) : null}
		</View>
	);
};

const styles = StyleSheet.create({
	title: {
		fontSize: 30,
		fontWeight: 'bold',
		color: COLORS.darkTransparent,
		textAlign: 'center',
		fontFamily: 'cosmic-bold',
	},
	screen: {
		flex: 1,
		backgroundColor: 'white',
	},
	container: {
		flex: 1,
		padding: 10,
		backgroundColor: 'white',
	},
	scrollContent: {
		paddingBottom: 20,
	},
	outBar: {
		paddingHorizontal: 10,
		paddingTop: 8,
		paddingBottom: 76,
		backgroundColor: COLORS.white,
		borderTopWidth: 1,
		borderTopColor: COLORS.gray,
	},
	row: {
		display: 'flex',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 12,
	},
	dateBlock: {
		marginTop: 12,
	},
	dateLabel: {
		fontSize: 13,
		color: COLORS.darkTransparent,
	},
	dateValue: {
		fontSize: 13,
		color: COLORS.darkTransparent,
		marginTop: 4,
		textAlign: 'right',
		flexWrap: 'wrap',
	},
	cols: {
		fontSize: 13,
		color: COLORS.darkTransparent,
		textAlign: 'center',
	},
	receiptFooter: {
		fontSize: 14,
		marginTop: 30,
		color: COLORS.darkTransparent,
		textAlign: 'center',
	},
	receiptHead: {
		fontSize: 15,
		color: COLORS.darkTransparent,
		textAlign: 'center',
	},
	printButton: {
		backgroundColor: COLORS.primary,
		borderRadius: 2,
		paddingVertical: 12,
	},
	searchButton: {
		backgroundColor: COLORS.darkGreen,
		marginTop: 10,
		borderRadius: 2,
		paddingVertical: 8,
	},
	photoRow: {
		flexDirection: 'row',
		marginBottom: 10,
	},
	photoColumn: {
		flex: 1,
		marginRight: 6,
	},
	photoColumnRight: {
		marginRight: 0,
		marginLeft: 6,
	},
	captureBox: {
		minHeight: 120,
		paddingHorizontal: 8,
		paddingVertical: 12,
		borderWidth: 1,
		borderColor: COLORS.primary,
		borderRadius: 4,
		alignItems: 'center',
		justifyContent: 'center',
	},
	captureText: {
		marginTop: 8,
		color: COLORS.primary,
		fontWeight: 'bold',
		textAlign: 'center',
	},
	previewImage: {
		width: '100%',
		height: 120,
		borderRadius: 6,
		backgroundColor: COLORS.lightGray,
	},
	photoLabel: {
		color: COLORS.primary,
		fontWeight: 'bold',
		marginBottom: 6,
		textAlign: 'center',
	},
	photoAction: {
		color: COLORS.primary,
		fontWeight: 'bold',
		textAlign: 'center',
		marginTop: 6,
	},
	photoActions: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	grayStrip: {
		paddingHorizontal: 10,
		backgroundColor: COLORS.lightGray,
		marginVertical: 10,
	},
	tickerContainer: {
		marginTop: 5,
		padding: 20,
		backgroundColor: COLORS.lightGray,
	},
});

export default Index;