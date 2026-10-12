import {apiClient, parkingApiClient} from './client';
import {normalizePlate, toPlateImagePart} from '../utils/plateNumber';

const endPoint = {
  entryVehicle: '/parking/in',
  getVehicleType: '/get/vehicle/types',
  searchVehicle: '/parking/status',
  exitVehicle: '/parking/out',
  readPlate: '/parking/read-plate',
  activeVehicles: '/parking/active',
};

function stripContentType(headers) {
  if (!headers) {
    return;
  }

  delete headers['Content-Type'];
  delete headers['content-type'];
  if (headers.common) {
    delete headers.common['Content-Type'];
    delete headers.common['content-type'];
  }
  if (headers.post) {
    delete headers.post['Content-Type'];
    delete headers.post['content-type'];
  }
}

function postMultipart(url, form) {
  return parkingApiClient.post(url, form, {
    timeout: 60000,
    transformRequest: (data, headers) => {
      stripContentType(headers);
      return data;
    },
  });
}

function looksLikeSlipNumber(value) {
  return /^\d+$/.test(String(value || '').trim());
}

function buildParkingForm(postData) {
  const form = new FormData();
  const rawPlate =
    postData.plate_number ||
    postData.vehicleNo ||
    postData.vehicle_number ||
    postData.billOrVehicleNumber;
  const plateNumber = normalizePlate(rawPlate);
  const slipNumber =
    postData.slip_number ||
    postData.slipNumber ||
    postData.bill_number ||
    (looksLikeSlipNumber(rawPlate) ? String(rawPlate).trim() : null);
  const plateImage = toPlateImagePart(postData.plate_image || postData.plateImage);
  const vehicleImage = toPlateImagePart(
    postData.vehicle_image || postData.vehicleImage,
  );
  const entryMethod =
    postData.plate_entry_method || (plateImage ? 'scanned' : 'manual');

  const vehicleTypeId = postData.vehicle_type_id || postData.vehicleType;
  const vehicleTypeName = postData.vehicle_type || postData.vehicleTypeName;

  if (plateNumber) {
    form.append('plate_number', plateNumber);
  }

  if (slipNumber) {
    form.append('slip_number', String(slipNumber));
  }

  form.append('plate_entry_method', entryMethod);

  if (vehicleTypeId) {
    form.append('vehicle_type_id', String(vehicleTypeId));
  }

  if (vehicleTypeName) {
    form.append('vehicle_type', String(vehicleTypeName));
  }

  if (plateImage) {
    form.append('plate_image', {
      ...plateImage,
      name: 'plate.jpg',
    });
  }

  if (vehicleImage) {
    form.append('vehicle_image', {
      ...vehicleImage,
      name: 'vehicle.jpg',
    });
  }

  return form;
}

const entryVehicle = postData => {
  return postMultipart(endPoint.entryVehicle, buildParkingForm(postData));
};

const exitVehicle = postData => {
  return postMultipart(endPoint.exitVehicle, buildParkingForm(postData));
};

const searchVehicle = postData => {
  const raw = String(
    postData.billOrVehicleNumber ||
      postData.slip_number ||
      postData.plate_number ||
      '',
  ).trim();
  const identifier = looksLikeSlipNumber(raw) ? raw : normalizePlate(raw);

  return parkingApiClient.get(
    `${endPoint.searchVehicle}/${encodeURIComponent(identifier)}`,
  );
};

const getVehicleType = postData => {
  return apiClient.post(endPoint.getVehicleType, postData);
};

const getActiveVehicles = () => {
  return parkingApiClient.get(endPoint.activeVehicles);
};

const readPlate = postData => {
  const form = new FormData();
  const plateImage = toPlateImagePart(postData.plate_image);

  if (plateImage) {
    form.append('plate_image', {
      ...plateImage,
      name: 'plate.jpg',
    });
  }

  return postMultipart(endPoint.readPlate, form);
};

export default {
  getVehicleType,
  getActiveVehicles,
  entryVehicle,
  searchVehicle,
  exitVehicle,
  readPlate,
};
