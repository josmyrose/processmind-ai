import axios from "axios";

const API = axios.create({
  baseURL: "http://127.0.0.1:8000",
});

export function setAuthToken(token: string | null) {
  if (token) {
    API.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete API.defaults.headers.common.Authorization;
}

export default API;
