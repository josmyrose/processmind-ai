// src/api.js
import axios from "axios";

export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return axios.post("/upload", formData);
};