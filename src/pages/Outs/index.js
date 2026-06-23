import React, { useContext } from 'react';
import { StyleSheet, Text, View, ToastAndroid, ScrollView } from 'react-native';
import { InputComponent, PrinterBanner } from '../../components';
import { Button } from 'react-native-elements/dist/buttons/Button';
import { COLORS, FONTS } from '../../constants';
import api from '../../api/services';
import AuthContext from '../../auth/Context';
import { usePrinter } from '../../printer/PrinterContext';
import {
	buildExitPrintDetails,
	buildExitPrintExtras,
	enrichSearchDetails,
	extractParkingDetails,
	getResponseMessage,
	isFailureMessage,
	isValidParkingRecord,
	normalizeParkingRecord,
	printExitSlip,
} from '../../printer/printSlip';

const Index = () => {
	const [billOrVehicleNumber, setBillOrVehicleNumber] = React.useState('');
	const [buttonLoading, setButtonLoading] = React.useState(false);
	const [printButtonLoading, setPrintButtonLoading] = React.useState(false);
	const [parkingDetails, setParkingDetails] = React.useState(null);

	const authContext = React.useContext(AuthContext);
	const { isConnected, printerMessage } = usePrinter();

	async function exitVehicleHandler() {
		if (!isConnected) {
			ToastAndroid.showWithGravity(
				printerMessage,
				ToastAndroid.SHORT,
				ToastAndroid.BOTTOM,
			);
			return;
		}

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
			let response = await api.exitVehicle({
				employeeId: authContext?.user?.id,
				parkingId: savedDetails.id,
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

			const exitDetails = buildExitPrintDetails(savedDetails, apiDetails);
			const printExtras = buildExitPrintExtras(savedDetails, apiDetails);

			try {
				await printExitSlip(exitDetails, printExtras);
			} catch (printError) {
				ToastAndroid.showWithGravity(
					printError.message || 'Failed to print exit slip',
					ToastAndroid.SHORT,
					ToastAndroid.BOTTOM,
				);
				return;
			}

			setParkingDetails(null);
			ToastAndroid.showWithGravity(
				!isFailureMessage(responseMessage) && responseMessage
					? responseMessage
					: 'Exit slip printed',
				ToastAndroid.SHORT,
				ToastAndroid.BOTTOM,
			);
		} catch (err) {
			ToastAndroid.showWithGravity(
				err?.response?.data?.error?.message || 'Failed to process exit',
				ToastAndroid.SHORT,
				ToastAndroid.BOTTOM,
			);
		} finally {
			setPrintButtonLoading(false);
		}
	}

	async function handleFormSubmit() {
		setButtonLoading(true);
		if (billOrVehicleNumber !== '') {
			try {
				let response = await api.searchVehicle({
					billOrVehicleNumber: billOrVehicleNumber,
				});

				setButtonLoading(false);
				const details = enrichSearchDetails(response);

				if (details && !details.vehicle_number && billOrVehicleNumber) {
					details.vehicle_number = billOrVehicleNumber.trim().toUpperCase();
				}

				if (!isValidParkingRecord(details)) {
					setParkingDetails(null);
					ToastAndroid.showWithGravity(
						getResponseMessage(response) || 'Record not available',
						ToastAndroid.SHORT,
						ToastAndroid.BOTTOM,
					);
					return;
				}

				setParkingDetails(details);
				setBillOrVehicleNumber('');
				ToastAndroid.show(
					getResponseMessage(response),
					ToastAndroid.SHORT,
					ToastAndroid.BOTTOM,
				);
			} catch (err) {
				setButtonLoading(false);
				setParkingDetails(null);
				ToastAndroid.showWithGravity(
					err.response.data.error.message,
					ToastAndroid.SHORT,
					ToastAndroid.BOTTOM,
				);
			}
		} else {
			setButtonLoading(false);
			setParkingDetails(null);
			ToastAndroid.showWithGravity(
				'Please enter vehicle number or bill number!',
				ToastAndroid.SHORT,
				ToastAndroid.CENTER,
			);
		}
	}

	return (
		<ScrollView style={styles.container} keyboardShouldPersistTaps="never">
			<PrinterBanner />
			<InputComponent
				required={true}
				label="Bill/Vehicle Number"
				leftIcon="bus"
				value={billOrVehicleNumber}
				onChangeText={value => setBillOrVehicleNumber(value.toUpperCase())}
			/>

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
								{parkingDetails?.get_vehicle_type_and_fare?.vehicle_type ||
									parkingDetails?.vehicle_type}
							</Text>
						</View>

						<View style={styles.row}>
							<Text style={styles.cols}>Vehicle Number</Text>
							<Text style={styles.cols}>
								{parkingDetails?.vehicle_number?.toUpperCase()}
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
					<Button
						title="Print"
						buttonStyle={[
							styles.printButton,
							!isConnected && { backgroundColor: COLORS.gray },
						]}
						loading={printButtonLoading}
						disabled={!isConnected}
						onPress={exitVehicleHandler}
					/>
					{!isConnected ? (
						<Text
							style={{
								marginTop: 10,
								color: COLORS.orange,
								fontWeight: 'bold',
								textAlign: 'center',
							}}>
							{printerMessage}
						</Text>
					) : null}
				</>
			)}
		</ScrollView>
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
	container: {
		flex: 1,
		padding: 10,
		backgroundColor: 'white',
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
		marginTop: 20,
		borderRadius: 2,
		paddingVertical: 8,
	},
	searchButton: {
		backgroundColor: COLORS.darkGreen,
		marginTop: 10,
		borderRadius: 2,
		paddingVertical: 8,
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