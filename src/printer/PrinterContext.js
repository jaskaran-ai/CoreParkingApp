import React, {createContext, useCallback, useContext, useEffect, useState} from 'react';
import {ToastAndroid} from 'react-native';
import {
  connectToDevice,
  disconnectDevice,
  getPairedDevices,
  isModuleAvailable,
  PRINTER_NOT_CONNECTED_MESSAGE,
  subscribeToPrinterEvents,
} from './bluetoothPrinter';

const PrinterContext = createContext({
  isConnected: false,
  connectedDevice: null,
  devices: [],
  loading: false,
  connectPrinter: async () => {},
  disconnectPrinter: async () => {},
  refreshDevices: async () => {},
  printerMessage: PRINTER_NOT_CONNECTED_MESSAGE,
});

export function PrinterProvider({children}) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshDevices = useCallback(async () => {
    if (!isModuleAvailable()) {
      setDevices([]);
      return [];
    }

    try {
      const pairedDevices = await getPairedDevices();
      setDevices(pairedDevices);
      return pairedDevices;
    } catch (error) {
      ToastAndroid.showWithGravity(
        error.message || 'Unable to load paired bluetooth devices',
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
      setDevices([]);
      return [];
    }
  }, []);

  const connectPrinter = useCallback(async device => {
    if (!device?.address) {
      ToastAndroid.showWithGravity(
        PRINTER_NOT_CONNECTED_MESSAGE,
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
      return false;
    }

    setLoading(true);
    try {
      await connectToDevice(device.address);
      setConnectedDevice(device);
      setIsConnected(true);
      ToastAndroid.showWithGravity(
        `Printer connected: ${device.name || device.address}`,
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
      return true;
    } catch (error) {
      setConnectedDevice(null);
      setIsConnected(false);
      ToastAndroid.showWithGravity(
        error.message || 'Failed to connect printer',
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnectPrinter = useCallback(async () => {
    setLoading(true);
    try {
      await disconnectDevice();
      setConnectedDevice(null);
      setIsConnected(false);
    } catch (error) {
      ToastAndroid.showWithGravity(
        error.message || 'Failed to disconnect printer',
        ToastAndroid.SHORT,
        ToastAndroid.BOTTOM,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  useEffect(() => {
    return subscribeToPrinterEvents({
      onConnected: () => setIsConnected(true),
      onDisconnected: () => {
        setIsConnected(false);
        setConnectedDevice(null);
      },
    });
  }, []);

  return (
    <PrinterContext.Provider
      value={{
        isConnected,
        connectedDevice,
        devices,
        loading,
        connectPrinter,
        disconnectPrinter,
        refreshDevices,
        printerMessage: PRINTER_NOT_CONNECTED_MESSAGE,
      }}>
      {children}
    </PrinterContext.Provider>
  );
}

export function usePrinter() {
  return useContext(PrinterContext);
}

export default PrinterContext;
