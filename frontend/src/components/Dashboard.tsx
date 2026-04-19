import { useId, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import API from "../api/api";

type UploadResponse = {
  message?: string;
  rows?: number;
  columns?: string[];
  error?: string;
};

const expectedColumns = ["case_id", "activity", "timestamp"];

const insights = [
  {
    value: "3 fields",
    label: "Required schema",
    description: "The importer validates the event log structure before processing starts.",
  },
  {
    value: "CSV first",
    label: "Fast onboarding",
    description: "Upload operational exports directly without building a manual mapping screen.",
  },
  {
    value: "Instant check",
    label: "Quality feedback",
    description: "Surface row counts and detected columns immediately after upload.",
  },
];

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function Dashboard() {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<UploadResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileDetails = useMemo(() => {
    if (!file) return [];

    return [
      { label: "Filename", value: file.name },
      { label: "Type", value: file.type || "text/csv" },
      { label: "Size", value: formatFileSize(file.size) },
    ];
  }, [file]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0] || null;
    setFile(nextFile);
    setData(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setData(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await API.post<UploadResponse>("/upload", formData);

      if (response.data.error) {
        setError(response.data.error);
        return;
      }

      setData(response.data);
    } catch {
      setError("The upload failed. Make sure the backend is running on port 8000 and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="dashboard-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">ProcessMind AI</p>
          <h1>Upload event logs and turn raw process data into a cleaner operational view.</h1>
          <p className="hero-text">
            Start with a CSV export, validate the required schema, and get an
            immediate summary of what the platform detected before deeper process mining begins.
          </p>

          <div className="hero-metrics">
            {insights.map((item) => (
              <article key={item.label} className="metric-card">
                <p className="metric-value">{item.value}</p>
                <h2>{item.label}</h2>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>

        <aside className="upload-panel">
          <div className="panel-header">
            <p className="panel-kicker">Data intake</p>
            <h2>Import an event log</h2>
            <p>
              Use a CSV with the required columns below. The dashboard will validate the structure on upload.
            </p>
          </div>

          <label className="upload-dropzone" htmlFor={inputId}>
            <input
              id={inputId}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
            />
            <span className="dropzone-badge">CSV</span>
            <strong>{file ? file.name : "Choose a file to begin"}</strong>
            <span>
              {file
                ? "Your file is ready to upload."
                : "Drag and drop is optional. You can also click here to browse."}
            </span>
          </label>

          <div className="schema-list" aria-label="Required columns">
            {expectedColumns.map((column) => (
              <span key={column} className="schema-pill">
                {column}
              </span>
            ))}
          </div>

          <button
            className="upload-button"
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload file"}
          </button>

          {fileDetails.length > 0 && (
            <dl className="file-details">
              {fileDetails.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {error && (
            <div className="feedback-card feedback-card-error" role="alert">
              <p className="feedback-label">Upload issue</p>
              <p>{error}</p>
            </div>
          )}

          {data && (
            <div className="feedback-card" role="status">
              <p className="feedback-label">Upload summary</p>
              <div className="summary-grid">
                <article>
                  <span>Rows</span>
                  <strong>{data.rows ?? 0}</strong>
                </article>
                <article>
                  <span>Columns</span>
                  <strong>{data.columns?.length ?? 0}</strong>
                </article>
              </div>
              <p className="feedback-message">{data.message ?? "Upload completed."}</p>
              {data.columns && data.columns.length > 0 && (
                <div className="detected-columns">
                  {data.columns.map((column) => (
                    <span key={column} className="detected-pill">
                      {column}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
      </section>

      <section className="workflow-panel">
        <div>
          <p className="panel-kicker">Workflow</p>
          <h2>What happens after upload</h2>
        </div>
        <div className="workflow-grid">
          <article>
            <span>01</span>
            <h3>Validate schema</h3>
            <p>Check that your log includes `case_id`, `activity`, and `timestamp`.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Summarize structure</h3>
            <p>Capture row count and available columns so the data quality is immediately visible.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Prepare analysis</h3>
            <p>Set the stage for process discovery, conformance checks, and later operational insights.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
