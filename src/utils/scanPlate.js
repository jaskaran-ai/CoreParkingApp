import {NativeModules} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import api from '../api/services';
import {extractPlateFromText} from './plateNumber';

const {PlateOcr} = NativeModules;

async function recognizeWithNative(path) {
  if (!PlateOcr?.recognize) {
    return '';
  }

  try {
    const text = await PlateOcr.recognize(path);
    return extractPlateFromText(text);
  } catch (error) {
    return '';
  }
}

async function recognizeWithApi(image) {
  try {
    const response = await api.readPlate({plate_image: image});
    return (
      extractPlateFromText(response?.data?.data?.plate_number) ||
      extractPlateFromText(response?.data?.data?.raw_text) ||
      ''
    );
  } catch (error) {
    return '';
  }
}

function toLocalImage(captured) {
  return {
    path: captured.path,
    uri: captured.path.startsWith('file://')
      ? captured.path
      : `file://${captured.path}`,
    mime: captured.mime || 'image/jpeg',
  };
}

export async function readPlateFromImage(image) {
  const nativePlate = await recognizeWithNative(image.path);
  if (nativePlate) {
    return nativePlate;
  }

  return recognizeWithApi(image);
}

const IMAGE_COMPRESS = {
  mediaType: 'photo',
  compressImageQuality: 0.4,
  compressImageMaxWidth: 1024,
  compressImageMaxHeight: 1024,
};

export async function captureVehiclePhoto() {
  const captured = await ImagePicker.openCamera({
    ...IMAGE_COMPRESS,
    cropping: false,
  });

  return toLocalImage(captured);
}

export async function scanVehiclePlate() {
  const captured = await ImagePicker.openCamera({
    ...IMAGE_COMPRESS,
    cropping: true,
    freeStyleCropEnabled: true,
    cropperToolbarTitle: 'Crop the number plate',
  });

  const image = toLocalImage(captured);
  const plate = await readPlateFromImage(image);

  return {
    ...image,
    plate,
  };
}
