import axios from 'axios';

const BASE_URL = 'https://apkanda.suryacontractors.com/api';
// const BASE_URL = 'http://192.168.1.5:8000/api';

// Local Laravel API (apkanda_api). Android emulator uses 10.0.2.2.
// On a physical device, use your machine LAN IP or `adb reverse tcp:8000 tcp:8000`
// and switch this to http://127.0.0.1:8000/api
const PARKING_API_URL = 'https://apkanda.suryacontractors.com/api';

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    Authorization:
      'Bearer $2y$10$5OmYFG9clk67v8g2VO.YXOwSqVyX9MzPdtXhyQ4lHVjdpm62wuLMK',
    Accept: 'application/json',
  },
});

const parkingApiClient = axios.create({
  baseURL: PARKING_API_URL,
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

export {apiClient, parkingApiClient, BASE_URL, PARKING_API_URL, axios};
