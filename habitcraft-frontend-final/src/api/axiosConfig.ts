import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// REPLACE THIS IP WITH YOUR COMPUTER'S IP ADDRESS
// Make sure to keep the :5000/api at the end!
const BASE_URL = 'http://192.168.19.103:5000/api'; 

// const BASE_URL = 'http://10.213.167.34:5000/api';    // use this one but change the ip when networkchange (ipconfig)

//const BASE_URL = 'http://localhost:5000/api';     // use this one when just want to show on web

const api = axios.create({
  baseURL: BASE_URL,
  //baseURL: 'http://localhost:5000/api',
  
});

// This automatically attaches your JWT token to every request
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;