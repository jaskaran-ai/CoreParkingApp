import React, {useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Button, Icon} from 'react-native-elements';
import {COLORS, FONTS} from '../constants/theme';
import {usePrinter} from '../printer/PrinterContext';

export default function PrinterBanner() {
  const {
    isConnected,
    connectedDevice,
    devices,
    loading,
    connectPrinter,
    disconnectPrinter,
    refreshDevices,
    printerMessage,
  } = usePrinter();
  const [modalVisible, setModalVisible] = useState(false);

  async function openDeviceList() {
    setModalVisible(true);
    await refreshDevices();
  }

  if (isConnected) {
    return (
      <View style={[styles.banner, styles.connectedBanner]}>
        <Icon name="print" type="material" color={COLORS.white} size={20} />
        <Text style={styles.connectedText}>
          Printer connected
          {connectedDevice?.name ? `: ${connectedDevice.name}` : ''}
        </Text>
        <TouchableOpacity onPress={disconnectPrinter} disabled={loading}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.banner, styles.warningBanner]}>
        <Icon name="warning" type="material" color={COLORS.white} size={20} />
        <Text style={styles.warningText}>{printerMessage}</Text>
        <Button
          title="Connect"
          loading={loading}
          buttonStyle={styles.connectButton}
          titleStyle={styles.connectButtonTitle}
          onPress={openDeviceList}
        />
      </View>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={[FONTS.h4, styles.modalTitle]}>
                Select Bluetooth Printer
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" type="material" color={COLORS.darkTransparent} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <ActivityIndicator
                size="large"
                color={COLORS.primary}
                style={styles.loader}
              />
            ) : devices.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  No paired printers found. Pair your thermal printer in phone
                  Bluetooth settings, then tap refresh.
                </Text>
                <Button
                  title="Refresh"
                  buttonStyle={styles.refreshButton}
                  onPress={refreshDevices}
                />
              </View>
            ) : (
              <FlatList
                data={devices}
                keyExtractor={item => item.address}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={styles.deviceItem}
                    onPress={async () => {
                      const connected = await connectPrinter(item);
                      if (connected) {
                        setModalVisible(false);
                      }
                    }}>
                    <Icon
                      name="bluetooth"
                      type="material"
                      color={COLORS.primary}
                      size={22}
                    />
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName}>
                        {item.name || 'Unknown device'}
                      </Text>
                      <Text style={styles.deviceAddress}>{item.address}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    borderRadius: 8,
  },
  warningBanner: {
    backgroundColor: COLORS.orange,
  },
  connectedBanner: {
    backgroundColor: COLORS.darkGreen,
  },
  warningText: {
    flex: 1,
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 13,
    marginHorizontal: 8,
  },
  connectedText: {
    flex: 1,
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 13,
    marginHorizontal: 8,
  },
  disconnectText: {
    color: COLORS.white,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  connectButton: {
    backgroundColor: COLORS.white,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  connectButtonTitle: {
    color: COLORS.orange,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: COLORS.primary,
  },
  loader: {
    marginVertical: 24,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.darkTransparent,
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray,
  },
  deviceInfo: {
    marginLeft: 12,
    flex: 1,
  },
  deviceName: {
    fontWeight: 'bold',
    color: COLORS.darkTransparent,
  },
  deviceAddress: {
    color: COLORS.darkgray,
    fontSize: 12,
    marginTop: 2,
  },
});
