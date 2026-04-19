import { useEffect, useState } from "react";
import API from "../api/api";

type ProcessData = {
  transitions: number;
  places: number;
};

function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ProcessData | null>(null);
const handleUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await API.post("/upload", formData);
      console.log("API RESPONSE:", res.data); 
      setData(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      <h1>Process Dashboard</h1>

      <input
        type="file"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button onClick={handleUpload}>Upload</button>

      {data && (
        <div>
          <p>Rows: {data.rows}</p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;