import { useId, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import API from "../api/api";
import type { User } from "./AuthPage";

type UploadResponse = {
  message?: string;
  rows?: number;
  columns?: string[];
  error?: string;
  missing_columns?: string[];
  detected_columns?: string[];
  accepted_aliases?: Record<string, string[]>;
};

type AnalysisResponse = {
  summary: {
    cases: number;
    events: number;
    activities: number;
    avg_events_per_case: number;
    avg_cycle_time_hours: number;
    max_cycle_time_hours: number;
    rework_rate: number;
  };
  process_map: {
    places: number;
    transitions: number;
  };
  top_variants: Array<{
    variant: string;
    cases: number;
  }>;
  activity_stats: Array<{
    activity: string;
    events: number;
    share: number;
  }>;
  bottlenecks: Array<{
    activity: string;
    avg_wait_hours: number;
  }>;
  insights: string[];
};

type SimulationResponse = {
  baseline: {
    avg_cycle_time_hours: number;
    events: number;
  };
  scenarios: Array<{
    name: string;
    assumption: string;
    projected_cycle_time_hours: number;
    throughput_change_pct: number;
  }>;
};

type OptimizationResponse = {
  best_scenario: {
    name: string;
    assumption: string;
    projected_cycle_time_hours: number;
    throughput_change_pct: number;
  };
  recommendations: Array<{
    title: string;
    priority: string;
    expected_impact: string;
    owner: string;
  }>;
  agent_actions: string[];
};

const expectedColumns = ["case_id", "activity", "timestamp"];

const workspaceMenu = [
  {
    key: "upload",
    label: "Upload logs",
    eyebrow: "Step 1",
    title: "Ingest event data",
    description:
      "Bring in CSV event logs, validate the schema, and prepare a clean process dataset for downstream AI tasks.",
    outputs: ["Validated log", "Normalized columns", "Row and field summary"],
  },
  {
    key: "analyze",
    label: "Analyze",
    eyebrow: "Step 2",
    title: "Discover the current process",
    description:
      "Use the uploaded event log to reconstruct the real workflow, measure bottlenecks, and surface conformance gaps.",
    outputs: ["Process map", "Variant analysis", "Cycle-time and rework insights"],
  },
  {
    key: "simulate",
    label: "Simulate",
    eyebrow: "Step 3",
    title: "Test what-if scenarios",
    description:
      "Create scenario runs from the discovered workflow so teams can compare staffing, routing, and policy changes before rollout.",
    outputs: ["Scenario assumptions", "Throughput forecast", "Service-level impact"],
  },
  {
    key: "optimize",
    label: "Optimize",
    eyebrow: "Step 4",
    title: "Recommend next actions with agentic AI",
    description:
      "Coordinate AI agents to turn process findings into prioritized improvement actions, automation ideas, and decision-ready recommendations.",
    outputs: ["Improvement backlog", "Automation candidates", "Owner-ready recommendations"],
  },
] as const;

const workspaceLogic = {
  upload: {
    heading: "Menu logic",
    intro:
      "This menu stays open for every signed-in user, but only the upload step is available immediately.",
    bullets: [
      "Accept a CSV file and validate that `case_id`, `activity`, and `timestamp` are present.",
      "Normalize the detected fields and store a clean event-log summary for later actions.",
      "Unlock Analyze, Simulate, and Optimize only after a successful upload.",
    ],
  },
  analyze: {
    heading: "Analyze logic",
    intro:
      "Once a log is uploaded, process mining starts from the real execution history rather than a manually drawn workflow.",
    bullets: [
      "Group events by case to reconstruct the as-is workflow and the main process variants.",
      "Measure activity frequency, waiting time, rework, handoffs, and deviations from the expected path.",
      "Generate an analysis summary that can feed both simulation and optimization agents.",
    ],
  },
  simulate: {
    heading: "Simulate logic",
    intro:
      "Simulation should build on the discovered workflow so scenario testing uses real baseline timings and transitions.",
    bullets: [
      "Use the analyzed event log as the baseline process model and timing distribution.",
      "Apply what-if assumptions such as reduced delays, extra capacity, or changed routing rules.",
      "Compare baseline and scenario KPIs like cycle time, throughput, and queue pressure.",
    ],
  },
  optimize: {
    heading: "Optimize logic",
    intro:
      "Optimization is the agentic layer that converts evidence into action instead of stopping at dashboards.",
    bullets: [
      "Feed the analysis and simulation outputs into specialized AI agents for bottlenecks, compliance, and automation.",
      "Rank opportunities by business impact, feasibility, and risk.",
      "Return a prioritized action plan with suggested owners, expected gains, and next steps.",
    ],
  },
};

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

type DashboardProps = {
  user: User;
  onLogout: () => void;
};

function Dashboard({ user, onLogout }: DashboardProps) {
  const inputId = useId();
  const [activeMenu, setActiveMenu] = useState<(typeof workspaceMenu)[number]["key"]>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<UploadResponse | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [simulation, setSimulation] = useState<SimulationResponse | null>(null);
  const [optimization, setOptimization] = useState<OptimizationResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasUploadedData = Boolean(data && !data.error);
  const canAnalyze = hasUploadedData;
  const canSimulate = Boolean(analysis);
  const canOptimize = Boolean(simulation);

  const activeMenuItem = workspaceMenu.find((item) => item.key === activeMenu) ?? workspaceMenu[0];
  const activeLogic = workspaceLogic[activeMenu];

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
    setAnalysis(null);
    setSimulation(null);
    setOptimization(null);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setData(null);
    setAnalysis(null);
    setSimulation(null);
    setOptimization(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await API.post<UploadResponse>("/upload", formData);

      if (response.data.error) {
        const missing = response.data.missing_columns?.length
          ? ` Missing: ${response.data.missing_columns.join(", ")}.`
          : "";
        const detected = response.data.detected_columns?.length
          ? ` Found: ${response.data.detected_columns.join(", ")}.`
          : "";
        setError(`${response.data.message ?? response.data.error}.${missing}${detected}`.replace(/\.\./g, "."));
        return;
      }

      setData(response.data);
      setActiveMenu("analyze");
    } catch {
      setError("The upload failed. Make sure the backend is running on port 8000 and try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcessAction = async () => {
    if (!hasUploadedData || activeMenu === "upload") {
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      if (activeMenu === "analyze") {
        const response = await API.post<AnalysisResponse>("/process/analyze");
        setAnalysis(response.data);
        setActiveMenu("simulate");
        return;
      }

      if (activeMenu === "simulate") {
        const response = await API.post<SimulationResponse>("/process/simulate");
        setSimulation(response.data);
        setActiveMenu("optimize");
        return;
      }

      const response = await API.post<OptimizationResponse>("/process/optimize");
      setOptimization(response.data);
    } catch (requestError: any) {
      setError(requestError?.response?.data?.detail ?? "The selected process action could not be completed.");
    } finally {
      setIsRunning(false);
    }
  };

  const menuActionLabel =
    activeMenu === "analyze"
      ? "Run analysis"
      : activeMenu === "simulate"
        ? "Run simulation"
        : activeMenu === "optimize"
          ? "Run optimization"
          : "Upload a CSV to continue";

  return (
    <main className="dashboard-shell">
      <header className="app-topbar">
        <div>
          <p className="eyebrow">Signed in</p>
          <strong className="topbar-name">{user.name}</strong>
          <p className="topbar-email">{user.email}</p>
        </div>
        <button className="secondary-button" type="button" onClick={onLogout}>
          Logout
        </button>
      </header>

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">ProcessMind AI</p>
          <h1>Upload event logs and turn raw process data into a cleaner operational view.</h1>
          <p className="hero-text">
            Start with a CSV export, validate the required schema, and get an
            immediate summary of what the platform detected before deeper process mining begins.
          </p>

          <nav className="workspace-menu" aria-label="Process workspace menu">
            {workspaceMenu.map((item) => {
              const isLocked =
                (item.key === "analyze" && !canAnalyze) ||
                (item.key === "simulate" && !canSimulate) ||
                (item.key === "optimize" && !canOptimize);
              const isActive = activeMenu === item.key;

              return (
                <button
                  key={item.key}
                  className={isActive ? "workspace-menu-item workspace-menu-item-active" : "workspace-menu-item"}
                  type="button"
                  disabled={isLocked}
                  onClick={() => setActiveMenu(item.key)}
                >
                  <span className="workspace-menu-step">{item.eyebrow}</span>
                  <strong>{item.label}</strong>
                  <span>
                    {isLocked
                      ? item.key === "analyze"
                        ? "Upload a valid log first"
                        : item.key === "simulate"
                          ? "Run analysis first"
                          : "Run simulation first"
                      : item.title}
                  </span>
                </button>
              );
            })}
          </nav>

          <section className="logic-panel" aria-live="polite">
            <p className="panel-kicker">{activeMenuItem.eyebrow}</p>
            <h2>{activeMenuItem.title}</h2>
            <p className="hero-text">{activeMenuItem.description}</p>
            <div className="logic-grid">
              <article className="logic-card">
                <p className="feedback-label">{activeLogic.heading}</p>
                <p>{activeLogic.intro}</p>
                <ul className="logic-list">
                  {activeLogic.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </article>
              <article className="logic-card">
                <p className="feedback-label">Outputs</p>
                <div className="schema-list" aria-label={`${activeMenuItem.label} outputs`}>
                  {activeMenuItem.outputs.map((output) => (
                    <span key={output} className="schema-pill">
                      {output}
                    </span>
                  ))}
                </div>
                {activeMenu !== "upload" && (
                  <p className="logic-note">
                    {activeMenu === "analyze"
                      ? "This step becomes available right after a successful CSV upload."
                      : activeMenu === "simulate"
                        ? "Run analysis first to build the simulation baseline."
                        : "Run simulation first so optimization can rank the best scenario."}
                  </p>
                )}
                {activeMenu !== "upload" && (
                  <button
                    className="upload-button logic-action-button"
                    type="button"
                    onClick={handleProcessAction}
                    disabled={
                      isRunning ||
                      (activeMenu === "analyze" && !canAnalyze) ||
                      (activeMenu === "simulate" && !canSimulate) ||
                      (activeMenu === "optimize" && !canOptimize)
                    }
                  >
                    {isRunning ? "Working..." : menuActionLabel}
                  </button>
                )}
              </article>
            </div>
          </section>

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
              {data.detected_columns && data.detected_columns.length > 0 && (
                <>
                  <p className="feedback-label">Detected columns</p>
                  <div className="detected-columns">
                    {data.detected_columns.map((column) => (
                      <span key={column} className="detected-pill">
                        {column}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {data.columns && data.columns.length > 0 && (
                <>
                  <p className="feedback-label">Normalized columns</p>
                  <div className="detected-columns">
                    {data.columns.map((column) => (
                      <span key={column} className="detected-pill">
                        {column}
                      </span>
                    ))}
                  </div>
                </>
              )}
              
            </div>
          )}
        </aside>
      </section>

      {(analysis || simulation || optimization) && (
        <section className="workflow-panel">
          <div>
            <p className="panel-kicker">Results</p>
            <h2>Process intelligence outputs</h2>
          </div>

          {analysis && (
            <div className="result-section">
              <p className="feedback-label">Analysis</p>
              <div className="summary-grid summary-grid-three">
                <article>
                  <span>Cases</span>
                  <strong>{analysis.summary.cases}</strong>
                </article>
                <article>
                  <span>Activities</span>
                  <strong>{analysis.summary.activities}</strong>
                </article>
                <article>
                  <span>Avg cycle time</span>
                  <strong>{analysis.summary.avg_cycle_time_hours}h</strong>
                </article>
              </div>
              <div className="result-grid">
                <article className="feedback-card">
                  <p className="feedback-label">Insights</p>
                  <ul className="logic-list">
                    {analysis.insights.map((insight) => (
                      <li key={insight}>{insight}</li>
                    ))}
                  </ul>
                </article>
                <article className="feedback-card">
                  <p className="feedback-label">Top variants</p>
                  <ul className="logic-list">
                    {analysis.top_variants.map((variant) => (
                      <li key={variant.variant}>
                        {variant.variant} ({variant.cases} cases)
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="feedback-card">
                  <p className="feedback-label">Bottlenecks</p>
                  <ul className="logic-list">
                    {analysis.bottlenecks.map((item) => (
                      <li key={item.activity}>
                        {item.activity}: {item.avg_wait_hours}h average wait
                      </li>
                    ))}
                  </ul>
                </article>
              </div>
            </div>
          )}

          {simulation && (
            <div className="result-section">
              <p className="feedback-label">Simulation</p>
              <div className="result-grid">
                {simulation.scenarios.map((scenario) => (
                  <article key={scenario.name} className="feedback-card">
                    <p className="feedback-label">{scenario.name}</p>
                    <p>{scenario.assumption}</p>
                    <div className="summary-grid">
                      <article>
                        <span>Projected cycle time</span>
                        <strong>{scenario.projected_cycle_time_hours}h</strong>
                      </article>
                      <article>
                        <span>Throughput change</span>
                        <strong>+{scenario.throughput_change_pct}%</strong>
                      </article>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {optimization && (
            <div className="result-section">
              <p className="feedback-label">Optimization</p>
              <div className="result-grid">
                <article className="feedback-card">
                  <p className="feedback-label">Best scenario</p>
                  <strong>{optimization.best_scenario.name}</strong>
                  <p>{optimization.best_scenario.assumption}</p>
                  <p className="feedback-message">
                    Target cycle time: {optimization.best_scenario.projected_cycle_time_hours}h with +
                    {optimization.best_scenario.throughput_change_pct}% throughput.
                  </p>
                </article>
                <article className="feedback-card">
                  <p className="feedback-label">Recommendations</p>
                  <ul className="logic-list">
                    {optimization.recommendations.map((recommendation) => (
                      <li key={recommendation.title}>
                        {recommendation.title} ({recommendation.priority}) - {recommendation.owner}
                      </li>
                    ))}
                  </ul>
                </article>
                <article className="feedback-card">
                  <p className="feedback-label">Agent actions</p>
                  <ul className="logic-list">
                    {optimization.agent_actions.map((action) => (
                      <li key={action}>{action}</li>
                    ))}
                  </ul>
                </article>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="workflow-panel">
        <div>
          <p className="panel-kicker">Workflow</p>
          <h2>Business process intelligence flow</h2>
        </div>
        <div className="workflow-grid workflow-grid-four">
          <article>
            <span>01</span>
            <h3>Validate schema</h3>
            <p>Check that your log includes `case_id`, `activity`, and `timestamp`.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Analyze execution</h3>
            <p>Discover the real workflow, bottlenecks, and process variants from uploaded event history.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Simulate scenarios</h3>
            <p>Test changes in routing, staffing, or policies before applying them to live operations.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Optimize with agents</h3>
            <p>Turn evidence into a prioritized action plan using specialized AI reasoning across the workflow.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
