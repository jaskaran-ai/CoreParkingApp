import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import {NavigationContainer} from '@react-navigation/native';
import React, {useContext} from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  ToastAndroid,
  TouchableOpacity,
} from 'react-native';
import {Button, Icon} from 'react-native-elements';
import {Layout} from '..';
import {InputComponent} from '../../components';
// import {PrinterBanner} from '../../components';
import {COLORS, FONTS} from '../../constants/theme';
import api from '../../api/services';
import {getApiErrorMessage} from '../../api/errors';
import AuthContext from '../../auth/Context';
// import {usePrinter} from '../../printer/PrinterContext';
// import {extractParkingDetails, printEntrySlip} from '../../printer/printSlip';
import {formatPlateForDisplay} from '../../utils/plateNumber';
import {
  captureVehiclePhoto,
  readPlateFromImage,
  scanVehiclePlate,
} from '../../utils/scanPlate';

const Tab = createMaterialTopTabNavigator();

function Card({title = 'Title', value = 0}) {
  return (
    <View
      style={{
        backgroundColor: COLORS.lightGray,
        padding: 20,
        marginTop: 10,
        width: '45%',
        borderRadius: 15,
        elevation: 2,
        alignItems: 'center',
      }}>
      <Text
        style={{
          backgroundColor: COLORS.primary,
          padding: 10,
          width: 150,
          borderRadius: 10,
          color: COLORS.white,
        }}>
        {title}
      </Text>
      <Text
        style={{
          marginTop: 10,
          fontSize: 40,
          color: COLORS.primary,
          fontWeight: 'bold',
        }}>
        {value}
      </Text>
    </View>
  );
}

function TopTabComponent({route}) {
  const [vehicleNumber, setVehicleNo] = React.useState('');
  const [vehicleImage, setVehicleImage] = React.useState(null);
  const [plateImage, setPlateImage] = React.useState(null);
  const [capturingVehicle, setCapturingVehicle] = React.useState(false);
  const [scanningPlate, setScanningPlate] = React.useState(false);
  const [buttonLoading, setButtonLoading] = React.useState(false);
  // const {isConnected, printerMessage} = usePrinter();

  let vehicle = route.params;
  let TickerPostData = {
    vehicleNo: vehicleNumber,
    employeeId: vehicle.employeeId,
    vehicleType: vehicle.id,
    vehicle_type_id: vehicle.id,
    vehicle_type: vehicle.vehicleTypeName || route.name,
  };

  function applyReadPlate(plate) {
    if (!plate) {
      ToastAndroid.showWithGravity(
        'Could not read the plate. Crop closer to the number and try again.',
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
      return;
    }

    setVehicleNo(formatPlateForDisplay(plate));
    ToastAndroid.showWithGravity(
      `Vehicle number: ${formatPlateForDisplay(plate)}`,
      ToastAndroid.SHORT,
      ToastAndroid.BOTTOM,
    );
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
      applyReadPlate(scanned.plate);
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
      const plate = await readPlateFromImage(plateImage);
      applyReadPlate(plate);
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

  async function submitTicketForm() {
    // if (!isConnected) {
    //   ToastAndroid.showWithGravity(
    //     printerMessage,
    //     ToastAndroid.SHORT,
    //     ToastAndroid.BOTTOM,
    //   );
    //   setButtonLoading(false);
    //   return;
    // }

    const trimmedVehicleNo = vehicleNumber?.trim().toUpperCase();
    if (!trimmedVehicleNo) {
      ToastAndroid.showWithGravity(
        'Vehicle Number is required',
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
      setButtonLoading(false);
      return;
    }

    if (!vehicleImage) {
      ToastAndroid.showWithGravity(
        'Vehicle photo is required',
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
      setButtonLoading(false);
      return;
    }

    if (!plateImage) {
      ToastAndroid.showWithGravity(
        'Number plate photo is required',
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
      setButtonLoading(false);
      return;
    }

    try {
      const res = await api.entryVehicle({
        ...TickerPostData,
        vehicleNo: trimmedVehicleNo,
        vehicle_image: vehicleImage,
        plate_image: plateImage,
        plate_entry_method: 'scanned',
      });
      // const parkingDetails = extractParkingDetails(res);
      // try {
      //   await printEntrySlip(parkingDetails, {
      //     vehicleNumber: trimmedVehicleNo,
      //     vehicleTypeName: vehicle.vehicleTypeName || route.name,
      //   });
      // } catch (printError) {
      //   ToastAndroid.showWithGravity(
      //     printError.message || 'Failed to print entry slip',
      //     ToastAndroid.SHORT,
      //     ToastAndroid.BOTTOM,
      //   );
      // }

      const slipNumber =
        res?.data?.data?.slip_number || res?.data?.data?.bill_number;
      ToastAndroid.showWithGravity(
        slipNumber
          ? `Entry slip generated: ${slipNumber}`
          : res.data?.data?.message || res.data?.message || 'Entry slip generated',
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
      setVehicleNo('');
      setVehicleImage(null);
      setPlateImage(null);
    } catch (err) {
      ToastAndroid.showWithGravity(
        getApiErrorMessage(err, 'Failed to generate entry slip'),
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
    } finally {
      setButtonLoading(false);
    }
  }

  return (
    <Layout>
      <ScrollView style={{flex: 1}}>
        <View
          style={{
            marginBottom: 30,
          }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-evenly',
            }}
          />
          <View style={{marginBottom: 60}}>
            <View
              style={{
                paddingHorizontal: 10,
                backgroundColor: COLORS.lightGray,
                marginVertical: 10,
              }}>
              <View
                style={{
                  flexDirection: 'row',
                  paddingVertical: 10,
                  justifyContent: 'flex-start',
                }}>
                <Text
                  style={[
                    FONTS.h4,
                    {
                      color: COLORS.primary,
                      fontWeight: 'bold',
                    },
                  ]}>
                  Generate Ticket
                </Text>
              </View>
            </View>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
              <View
                style={{
                  paddingHorizontal: 15,
                  marginTop: 5,
                }}>
                <InputComponent
                  required={true}
                  label="Vehicle Number"
                  leftIcon="bus"
                  onChangeText={text => setVehicleNo(formatPlateForDisplay(text))}
                  value={vehicleNumber}
                />
                <View
                  style={{
                    flexDirection: 'row',
                    marginBottom: 10,
                  }}>
                  <View style={{flex: 1, marginRight: 6}}>
                    {vehicleImage?.uri ? (
                      <View>
                        <Text
                          style={{
                            color: COLORS.primary,
                            fontWeight: 'bold',
                            marginBottom: 6,
                            textAlign: 'center',
                          }}>
                          Vehicle photo
                        </Text>
                        <TouchableOpacity
                          onPress={openVehicleCamera}
                          disabled={capturingVehicle}>
                          <Image
                            source={{uri: vehicleImage.uri}}
                            style={{
                              width: '100%',
                              height: 120,
                              borderRadius: 6,
                              backgroundColor: COLORS.lightGray,
                            }}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={openVehicleCamera}
                          disabled={capturingVehicle}>
                          <Text
                            style={{
                              color: COLORS.primary,
                              fontWeight: 'bold',
                              textAlign: 'center',
                              marginTop: 6,
                            }}>
                            {capturingVehicle ? 'Opening camera...' : 'Retake'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={openVehicleCamera}
                        disabled={capturingVehicle}
                        style={{
                          minHeight: 120,
                          paddingHorizontal: 8,
                          paddingVertical: 12,
                          borderWidth: 1,
                          borderColor: COLORS.primary,
                          borderRadius: 4,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Icon
                          name="car"
                          type="font-awesome"
                          size={18}
                          color={COLORS.primary}
                        />
                        <Text
                          style={{
                            marginTop: 8,
                            color: COLORS.primary,
                            fontWeight: 'bold',
                            textAlign: 'center',
                          }}>
                          {capturingVehicle
                            ? 'Opening camera...'
                            : 'Take vehicle photo'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={{flex: 1, marginLeft: 6}}>
                    {plateImage?.uri ? (
                      <View>
                        <Text
                          style={{
                            color: COLORS.primary,
                            fontWeight: 'bold',
                            marginBottom: 6,
                            textAlign: 'center',
                          }}>
                          Number plate
                        </Text>
                        <TouchableOpacity
                          onPress={openPlateCamera}
                          disabled={scanningPlate}>
                          <Image
                            source={{uri: plateImage.uri}}
                            style={{
                              width: '100%',
                              height: 120,
                              borderRadius: 6,
                              backgroundColor: COLORS.lightGray,
                            }}
                          />
                        </TouchableOpacity>
                        <View
                          style={{
                            marginTop: 6,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                          }}>
                          <TouchableOpacity
                            onPress={openPlateCamera}
                            disabled={scanningPlate}>
                            <Text
                              style={{
                                color: COLORS.primary,
                                fontWeight: 'bold',
                              }}>
                              {scanningPlate ? 'Opening...' : 'Retake'}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={rereadPlateFromPhoto}
                            disabled={scanningPlate}>
                            <Text
                              style={{
                                color: COLORS.primary,
                                fontWeight: 'bold',
                              }}>
                              Read again
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        onPress={openPlateCamera}
                        disabled={scanningPlate}
                        style={{
                          minHeight: 120,
                          paddingHorizontal: 8,
                          paddingVertical: 12,
                          borderWidth: 1,
                          borderColor: COLORS.primary,
                          borderRadius: 4,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}>
                        <Icon
                          name="camera"
                          type="font-awesome"
                          size={18}
                          color={COLORS.primary}
                        />
                        <Text
                          style={{
                            marginTop: 8,
                            color: COLORS.primary,
                            fontWeight: 'bold',
                            textAlign: 'center',
                          }}>
                          {scanningPlate
                            ? 'Reading plate...'
                            : 'Scan number plate'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <Button
                  title="Generate"
                  loading={buttonLoading}
                  // disabled={!isConnected}
                  buttonStyle={{
                    backgroundColor: COLORS.darkGreen,
                    // backgroundColor: isConnected ? COLORS.darkGreen : COLORS.gray,
                    marginTop: 10,
                    borderRadius: 2,
                    paddingVertical: 10,
                  }}
                  titleStyle={{
                    color: COLORS.white,
                  }}
                  onPress={() => {
                    setButtonLoading(true);
                    submitTicketForm();
                  }}
                />
                {/* {!isConnected ? (
                  <Text
                    style={{
                      marginTop: 10,
                      color: COLORS.orange,
                      fontWeight: 'bold',
                      textAlign: 'center',
                    }}>
                    {printerMessage}
                  </Text>
                ) : null} */}
              </View>
            </KeyboardAvoidingView>
          </View>
        </View>
      </ScrollView>
    </Layout>
  );
}

function DateTime() {
  const [dateTime, setDateTime] = React.useState();
  setInterval(function () {
    setDateTime(getDate());
  }, 10000);

  function getDate() {
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0');
    let yyyy = today.getFullYear();

    let hours = today.getHours();
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    var time = hours + ':' + today.getMinutes();

    return dd + '/' + mm + '/' + yyyy + '  ' + time + ' ' + ampm;
  }

  return (
    <Text
      style={{
        fontWeight: 'bold',
        color: COLORS.darkTransparent,
      }}>
      {dateTime}
    </Text>
  );
}

const Index = () => {
  const [vehicles, setVehicles] = React.useState([]);
  const [loadingFairs, setLoadingFairs] = React.useState(true);

  console.log(vehicles);
  //Use Effect Hooks
  const authContext = useContext(AuthContext);
  async function getVehicleTypeData() {
    try {
      let response = await api.getVehicleType({
        employeeId: authContext?.user?.id,
      });
      setVehicles(response?.data?.data);
      setLoadingFairs(false);
    } catch (e) {
      setLoadingFairs(false);
      console.error(e);
    }
  }

  React.useEffect(() => {
    getVehicleTypeData();
  }, []);

  console.log(vehicles);
  return (
    <Layout>
      <ScrollView contentContainerStyle={{flexGrow: 1}}>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 15,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
          }}>
          <View>
            <Text
              style={[
                FONTS.h3,
                {fontWeight: 'bold', color: COLORS.darkTransparent},
              ]}>
              Dashboard
            </Text>
            <DateTime />
          </View>
          <Text
            style={[
              FONTS.h4,
              {
                fontWeight: 'bold',
                color: COLORS.primary,
                textAlign: 'right',
                maxWidth: '55%',
              },
            ]}
            numberOfLines={1}>
            {authContext?.user?.name}
          </Text>
        </View>
        <View style={{flex: 1, paddingHorizontal: 10}}>
          {/* <PrinterBanner /> */}

          {/* <View
            style={{
              paddingVertical: 10,
            }}>
            <Text
              style={[
                FONTS.h5,
                {
                  fontWeight: 'bold',
                  color: COLORS.white,
                  backgroundColor: COLORS.green,
                  paddingVertical: 20,
                  elevation: 5,
                  width: '100%',
                  textAlign: 'center',
                },
              ]}>
              Today Collection : {vehicles.totalAmount} RS
            </Text>
          </View> */}

          {loadingFairs ? (
            <View style={{flex: 1, justifyContent: 'center'}}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : vehicles?.fairs?.length !== 0 ? (
            <NavigationContainer independent={true}>
              <Tab.Navigator
                initialRouteName="Parking"
                screenOptions={{
                  tabBarScrollEnabled: true,
                  tabBarStyle: {
                    backgroundColor: COLORS.white,
                  },
                  tabBarItemStyle: {
                    width: 'auto',
                    paddingHorizontal: 16,
                  },
                  tabBarLabelStyle: {fontSize: 13, fontWeight: 'bold'},
                  tabBarActiveTintColor: COLORS.white,
                  tabBarInactiveTintColor: COLORS.darkgray,
                  tabBarAllowFontScaling: false,
                  tabBarIndicatorStyle: {
                    height: '100%',
                    backgroundColor: COLORS.primary,
                  },
                  tabBarPressColor: COLORS.primary,
                }}>
                {vehicles?.fairs?.map(tab => {
                  return (
                    <Tab.Screen
                      key={tab.id}
                      name={tab.vehicle_type}
                      component={TopTabComponent}
                      initialParams={{
                        id: tab.id,
                        employeeId: authContext?.user?.id,
                        vehicleTypeName: tab.vehicle_type,
                      }}
                      options={{
                        title: tab.vehicle_type,
                      }}
                    />
                  );
                })}
              </Tab.Navigator>
            </NavigationContainer>
          ) : null}
        </View>
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'lightgray',
  },
});

export default Index;
