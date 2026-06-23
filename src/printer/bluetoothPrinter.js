import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

let BluetoothManager = null;
let BluetoothEscposPrinter = null;

try {
  const printerModule = require('react-native-bluetooth-escpos-printer');
  BluetoothManager = printerModule.BluetoothManager;
  BluetoothEscposPrinter = printerModule.BluetoothEscposPrinter;
} catch (error) {
  console.warn('Bluetooth printer module is not installed:', error.message);
}

const isModuleAvailable = () =>
  Boolean(BluetoothManager && BluetoothEscposPrinter);

export const PRINTER_NOT_CONNECTED_MESSAGE = 'Please connect printer to print';

export async function requestBluetoothPermissions() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const {PermissionsAndroid} = require('react-native');

  if (Platform.Version >= 31) {
    const granted = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    ]);

    return (
      granted['android.permission.BLUETOOTH_SCAN'] ===
        PermissionsAndroid.RESULTS.GRANTED &&
      granted['android.permission.BLUETOOTH_CONNECT'] ===
        PermissionsAndroid.RESULTS.GRANTED
    );
  }

  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

export async function isBluetoothEnabled() {
  if (!isModuleAvailable()) {
    return false;
  }

  try {
    const enabled = await BluetoothManager.isBluetoothEnabled();
    return Boolean(enabled);
  } catch (error) {
    console.warn('Failed to check bluetooth status:', error);
    return false;
  }
}

export async function getPairedDevices() {
  if (!isModuleAvailable()) {
    return [];
  }

  const hasPermission = await requestBluetoothPermissions();
  if (!hasPermission) {
    throw new Error('Bluetooth permissions are required to connect a printer');
  }

  const enabled = await isBluetoothEnabled();
  if (!enabled) {
    await BluetoothManager.enableBluetooth();
  }

  const devices = await BluetoothManager.enableBluetooth();
  if (!devices || devices.length === 0) {
    return [];
  }

  return devices
    .map(device => {
      try {
        return typeof device === 'string' ? JSON.parse(device) : device;
      } catch (error) {
        return null;
      }
    })
    .filter(Boolean);
}

export async function connectToDevice(address) {
  if (!isModuleAvailable()) {
    throw new Error('Bluetooth printer module is not available');
  }

  await BluetoothManager.connect(address);
}

export async function disconnectDevice() {
  if (!isModuleAvailable()) {
    return;
  }

  try {
    await BluetoothManager.unpair();
  } catch (error) {
    console.warn('Failed to disconnect printer:', error);
  }
}

export function subscribeToPrinterEvents({onConnected, onDisconnected}) {
  if (!isModuleAvailable()) {
    return () => {};
  }

  const emitter = new NativeEventEmitter(NativeModules.BluetoothManager);
  const connectedSub = emitter.addListener(
    BluetoothManager.EVENT_CONNECTED,
    onConnected,
  );
  const disconnectedSub = emitter.addListener(
    BluetoothManager.EVENT_CONNECTION_LOST,
    onDisconnected,
  );

  return () => {
    connectedSub.remove();
    disconnectedSub.remove();
  };
}

export {BluetoothEscposPrinter, isModuleAvailable};
