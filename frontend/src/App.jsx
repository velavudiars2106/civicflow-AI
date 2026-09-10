import { useEffect, useMemo, useState } from "react";
import "./App.css";

/*
=========================================================
CIVICFLOW
Citizen Grievance & Public Service Portal

Frontend:
React

Backend:
Express

AI:
Hugging Face Inference Providers

API:
POST http://localhost:5000/api/analyze
=========================================================
*/

const API_URL = "http://localhost:5000/api/analyze";

const TASK_STATUSES = [
  "Assigned",
  "In Progress",
  "Pending",
  "Resolved",
];

const SAMPLE_COMPLAINT =
  "The main road near the bus stand has large potholes. Garbage has not been collected for three days and street lights are not working.";

const DEPARTMENT_ICONS = {
  "Roads & Highways": "🛣️",
  Sanitation: "🗑️",
  "Sanitation Department": "🗑️",
  Electricity: "💡",
  "Electricity Department": "💡",
  "Water Supply": "💧",
  "Public Health": "🏥",
  Police: "🛡️",
  Revenue: "📋",
  "Municipal Administration": "🏛️",
  Transport: "🚌",
  Education: "🎓",
  "Rural Development": "🌾",
  "Urban Development": "🏙️",
  "Disaster Management": "⚠️",
  "Public Works Department": "🏗️",
  Environment: "🌱",
  "Social Welfare": "🤝",
};

function getDepartmentIcon(department) {
  return DEPARTMENT_ICONS[department] || "🏛️";
}

function getPriorityClass(priority) {
  return `priority priority-${String(
    priority || "medium"
  ).toLowerCase()}`;
}

function getStatusClass(status) {
  return `task-status task-status-${String(
    status || "assigned"
  )
    .toLowerCase()
    .replace(/\s+/g, "-")}`;
}

function formatStatus(status) {
  if (!status) return "Assigned";

  return status
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function generateCaseId() {
  const year = new Date().getFullYear();
  const random = Math.floor(100000 + Math.random() * 900000);

  return `CF-${year}-${random}`;
}

function calculateOverallStatus(tasks = []) {
  if (!tasks.length) return "Assigned";

  const statuses = tasks.map(
    (task) => task.status || "Assigned"
  );

  if (statuses.every((status) => status === "Resolved")) {
    return "Resolved";
  }

  if (statuses.some((status) => status === "In Progress")) {
    return "In Progress";
  }

  if (statuses.some((status) => status === "Pending")) {
    return "Pending";
  }

  return "Assigned";
}

function createDepartmentTasks(issues = []) {
  const now = new Date().toISOString();

  return issues.map((issue, index) => ({
    taskId: `TASK-${String(index + 1).padStart(3, "0")}`,
    issueIndex: index,
    title: issue?.title || `Civic Issue ${index + 1}`,
    department:
      issue?.department || "Relevant Government Department",
    action:
      issue?.action ||
      "Review the complaint and take necessary action.",
    location: issue?.location || "Not specified",
    deadline: issue?.deadline || "",
    priority: issue?.priority || "MEDIUM",
    status: "Assigned",
    createdAt: now,
    updatedAt: null,
  }));
}

function normalizeResult(result, complaint, location, photo) {
  return {
    ...result,

    input_type:
      result?.input_type || "citizen_grievance",

    summary:
      result?.summary ||
      "Your complaint has been received and is being reviewed.",

    overall_priority:
      result?.overall_priority || "MEDIUM",

    issues: Array.isArray(result?.issues)
      ? result.issues.map((issue) => ({
          title: issue?.title || "Civic Issue",

          department:
            issue?.department ||
            "Relevant Government Department",

          action:
            issue?.action ||
            "Review and take appropriate action.",

          priority:
            issue?.priority ||
            result?.overall_priority ||
            "MEDIUM",

          deadline: issue?.deadline ?? null,

          location:
            issue?.location ??
            location ??
            null,

          authority: issue?.authority ?? null,

          status: "Assigned",
        }))
      : [],

    originalComplaint: complaint,
    submittedLocation: location || null,
    photo: photo || null,
  };
}

/* =========================================================
   OFFICER AUTHENTICATION
========================================================= */

function OfficerAuthentication({
  onSuccess,
  onClose,
}) {
  const [officerId, setOfficerId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (event) => {
    event.preventDefault();

    const validOfficerId = "officer01";
    const validPassword = "CivicFlow@2026";

    if (
      officerId.trim() === validOfficerId &&
      password === validPassword
    ) {
      onSuccess({
        officerId: validOfficerId,
      });

      return;
    }

    setError(
      "Invalid officer ID or password. Please check your credentials."
    );
  };

  return (
    <div className="modal-overlay">
      <div className="auth-modal professional-auth">
        <button
          className="mini-close"
          onClick={onClose}
          aria-label="Close officer login"
        >
          ×
        </button>

        <div className="auth-government-mark">
          CF
        </div>

        <div className="modal-tag">
          AUTHORIZED GOVERNMENT ACCESS
        </div>

        <h2>Officer Portal</h2>

        <p className="auth-description">
          Authorized personnel can review citizen complaints,
          manage department tasks and update case progress.
        </p>

        <form onSubmit={handleLogin}>
          <label className="form-label">
            Officer ID
          </label>

          <input
            className="form-input"
            value={officerId}
            onChange={(e) =>
              setOfficerId(e.target.value)
            }
            placeholder="Enter officer ID"
            autoComplete="username"
          />

          <label className="form-label">
            Password
          </label>

          <input
            className="form-input"
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="Enter password"
            autoComplete="current-password"
          />

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            className="primary-button full-width"
            type="submit"
          >
            Sign in to Officer Portal
            <span>→</span>
          </button>
        </form>

        <div className="auth-demo-note">
          Hackathon prototype access
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CASE TRACKING DASHBOARD
========================================================= */

function CaseTrackingDashboard({
  trackedCases,
  trackingView,
  setTrackingView,
  trackingCaseId,
  setTrackingCaseId,
  searchedCase,
  trackingError,
  searchCase,
  closeTracking,
  updateDepartmentTaskStatus,
  deleteCase,
  officerAuthenticated,
  officerSession,
  signOutOfficer,
}) {
  const totalCases = trackedCases.length;

  const activeCases = trackedCases.filter(
    (item) =>
      item.status === "In Progress" ||
      item.status === "Assigned"
  ).length;

  const pendingCases = trackedCases.filter(
    (item) => item.status === "Pending"
  ).length;

  const resolvedCases = trackedCases.filter(
    (item) => item.status === "Resolved"
  ).length;

  return (
    <div className="page-overlay">
      <div className="dashboard-shell">

        <div className="dashboard-topbar">
          <div className="dashboard-brand">
            <div className="dashboard-logo">
              CF
            </div>

            <div>
              <span className="dashboard-kicker">
                CIVICFLOW
              </span>

              <h2>
                {trackingView === "officer"
                  ? "Officer Portal"
                  : "Complaint Tracking"}
              </h2>
            </div>
          </div>

          <div className="topbar-actions">

            {trackingView === "officer" &&
              officerAuthenticated && (
                <button
                  className="logout-button"
                  onClick={signOutOfficer}
                >
                  Sign Out
                </button>
              )}

            <button
              className="close-dashboard"
              onClick={closeTracking}
              aria-label="Close"
            >
              ×
            </button>

          </div>
        </div>

        {trackingView === "officer" ? (

          <div className="officer-console">

            <div className="officer-welcome">
              <div>
                <span className="section-tag">
                  AUTHORIZED ACCESS
                </span>

                <h3>
                  Welcome, {officerSession?.officerId || "Officer"}
                </h3>

                <p>
                  Review citizen submissions and update
                  department task progress.
                </p>
              </div>

              <div className="officer-secure">
                🔒 Secure officer workspace
              </div>
            </div>

            <div className="tracking-summary-grid">

              <div className="tracking-summary-item">
                <span>Total Complaints</span>
                <strong>{totalCases}</strong>
              </div>

              <div className="tracking-summary-item">
                <span>Active Cases</span>
                <strong>{activeCases}</strong>
              </div>

              <div className="tracking-summary-item">
                <span>Pending</span>
                <strong>{pendingCases}</strong>
              </div>

              <div className="tracking-summary-item">
                <span>Resolved</span>
                <strong>{resolvedCases}</strong>
              </div>

            </div>

            <div className="dashboard-section-heading">
              <div>
                <span className="section-tag">
                  CASE MANAGEMENT
                </span>

                <h3>Citizen complaints</h3>
              </div>
            </div>

            {trackedCases.length === 0 ? (

              <div className="empty-state">
                <div className="empty-icon">📋</div>

                <h3>No complaints yet</h3>

                <p>
                  Complaints submitted through CivicFlow
                  will appear here.
                </p>
              </div>

            ) : (

              <div className="officer-case-list">

                {trackedCases.map((caseItem) => {

                  const departments =
                    Array.isArray(caseItem.departments)
                      ? caseItem.departments
                      : [];

                  return (
                    <div
                      className="officer-case-card"
                      key={caseItem.id}
                    >

                      <div className="officer-case-header">

                        <div>
                          <span className="case-reference">
                            {caseItem.id}
                          </span>

                          <h3>
                            {caseItem.complaint}
                          </h3>

                          <p className="case-location">
                            📍 {caseItem.location}
                          </p>
                        </div>

                        <span
                          className={getStatusClass(
                            caseItem.status
                          )}
                        >
                          {formatStatus(
                            caseItem.status
                          )}
                        </span>

                      </div>

                      {departments.length > 0 && (

                        <div className="department-task-list">

                          {departments.map(
                            (task, index) => (

                              <div
                                className="department-task-card"
                                key={`${caseItem.id}-${index}`}
                              >

                                <div className="task-main">

                                  <div className="department-icon">
                                    {getDepartmentIcon(
                                      task.department
                                    )}
                                  </div>

                                  <div>
                                    <strong>
                                      {task.title}
                                    </strong>

                                    <span>
                                      {task.department}
                                    </span>

                                    <p>
                                      {task.action}
                                    </p>
                                  </div>

                                </div>

                                <div className="task-controls">

                                  <span
                                    className={getStatusClass(
                                      task.status
                                    )}
                                  >
                                    {formatStatus(
                                      task.status
                                    )}
                                  </span>

                                  <select
                                    value={
                                      task.status ||
                                      "Assigned"
                                    }
                                    onChange={(e) =>
                                      updateDepartmentTaskStatus(
                                        caseItem.id,
                                        index,
                                        e.target.value
                                      )
                                    }
                                  >

                                    {TASK_STATUSES.map(
                                      (status) => (
                                        <option
                                          key={status}
                                          value={status}
                                        >
                                          {status}
                                        </option>
                                      )
                                    )}

                                  </select>

                                </div>

                              </div>

                            )
                          )}

                        </div>

                      )}

                      <div className="case-card-footer">

                        <span>
                          Registered{" "}
                          {new Date(
                            caseItem.createdAt
                          ).toLocaleString("en-IN")}
                        </span>

                        <button
                          className="remove-case-button"
                          onClick={() =>
                            deleteCase(caseItem.id)
                          }
                        >
                          Remove
                        </button>

                      </div>

                    </div>
                  );
                })}

              </div>
            )}

            <div className="result-note">
              <span>ℹ</span>
              Case and department progress is stored
              locally in this hackathon prototype.
            </div>

          </div>

        ) : (

          <div className="citizen-tracking">

            <div className="tracking-intro">

              <span className="section-tag">
                CITIZEN SERVICE
              </span>

              <h3>
                Check your complaint status
              </h3>

              <p>
                Enter the Case ID you received after
                submitting your complaint.
              </p>

            </div>

            <form
              className="tracking-search"
              onSubmit={(e) => {
                e.preventDefault();
                searchCase();
              }}
            >

              <div className="tracking-input-wrap">

                <label htmlFor="tracking-id">
                  Complaint Case ID
                </label>

                <input
                  id="tracking-id"
                  value={trackingCaseId}
                  onChange={(e) =>
                    setTrackingCaseId(
                      e.target.value.toUpperCase()
                    )
                  }
                  placeholder="Example: CF-2026-123456"
                />

              </div>

              <button
                className="primary-button"
                type="submit"
              >
                Check Status
                <span>→</span>
              </button>

            </form>

            {trackingError && (
              <div className="error-message">
                {trackingError}
              </div>
            )}

            {searchedCase && (

              <div className="citizen-case-result">

                <div className="case-result-header">

                  <div>
                    <span className="section-tag">
                      CASE FOUND
                    </span>

                    <h3>
                      {searchedCase.id}
                    </h3>
                  </div>

                  <span
                    className={getStatusClass(
                      searchedCase.status
                    )}
                  >
                    {formatStatus(
                      searchedCase.status
                    )}
                  </span>

                </div>

                <div className="citizen-summary-card">

                  <span>YOUR COMPLAINT</span>

                  <p>
                    {searchedCase.complaint}
                  </p>

                  <div className="summary-location">
                    📍 {searchedCase.location}
                  </div>

                </div>

                <div className="status-timeline">

                  {[
                    "Registered",
                    "Assigned",
                    "In Progress",
                    "Resolved",
                  ].map((step, index) => {

                    const status =
                      searchedCase.status;

                    let active = false;

                    if (
                      status === "Assigned" &&
                      index <= 1
                    ) {
                      active = true;
                    }

                    if (
                      status === "In Progress" &&
                      index <= 2
                    ) {
                      active = true;
                    }

                    if (
                      status === "Resolved"
                    ) {
                      active = true;
                    }

                    if (
                      status === "Pending" &&
                      index <= 1
                    ) {
                      active = true;
                    }

                    return (
                      <div
                        className={`timeline-step ${
                          active ? "active" : ""
                        }`}
                        key={step}
                      >

                        <div className="timeline-dot">
                          {active ? "✓" : index + 1}
                        </div>

                        <span>{step}</span>

                        {index < 3 && (
                          <div
                            className={`timeline-line ${
                              active &&
                              index < 2
                                ? "active"
                                : ""
                            }`}
                          />
                        )}

                      </div>
                    );
                  })}

                </div>

                <div className="citizen-department-section">

                  <span className="section-tag">
                    DEPARTMENT PROGRESS
                  </span>

                  <h3>
                    Your complaint is being handled
                  </h3>

                  {(
                    searchedCase.departments || []
                  ).map((task, index) => (

                    <div
                      className="citizen-department-card"
                      key={index}
                    >

                      <div className="department-icon">
                        {getDepartmentIcon(
                          task.department
                        )}
                      </div>

                      <div>
                        <strong>
                          {task.department}
                        </strong>

                        <span>
                          {task.title}
                        </span>
                      </div>

                      <span
                        className={getStatusClass(
                          task.status
                        )}
                      >
                        {formatStatus(
                          task.status
                        )}
                      </span>

                    </div>

                  ))}

                </div>

              </div>
            )}

          </div>

        )}

      </div>
    </div>
  );
}

/* =========================================================
   COMPLAINT FORM
========================================================= */

function ComplaintModal({
  complaint,
  setComplaint,
  location,
  setLocation,
  inputType,
  setInputType,
  proofImage,
  proofImageName,
  fileInputRef,
  handleProofImage,
  removeProofImage,
  error,
  loading,
  analysis,
  openTracking,
  analyzeComplaint,
  closeForm,
  loadGrievanceExample,
  loadGovernmentOrderExample,
}) {
  const isGovernmentOrder =
    inputType === "government_order";

  return (
    <div className="modal-overlay">
      <div className="complaint-modal">

        <div className="complaint-modal-header">

          <div>
            <span className="section-tag">
              CITIZEN SERVICE
            </span>

            <h2>
              {analysis
                ? "Complaint submitted"
                : isGovernmentOrder
                ? "Government Order"
                : "Report a civic problem"}
            </h2>

            <p>
              {analysis
                ? "Your complaint has been registered successfully."
                : isGovernmentOrder
                ? "Authorized personnel can submit an administrative order for routing."
                : "Tell us what is happening in your area. You do not need to know which department handles it."}
            </p>
          </div>

          <button
            className="mini-close"
            onClick={closeForm}
            aria-label="Close"
          >
            ×
          </button>

        </div>

        {!analysis ? (

          <form
            className="complaint-form"
            onSubmit={analyzeComplaint}
          >

            <div className="citizen-progress">

              <div className="progress-step active">
                <span>1</span>
                Problem
              </div>

              <div className="progress-line" />

              <div className="progress-step">
                <span>2</span>
                Details
              </div>

              <div className="progress-line" />

              <div className="progress-step">
                <span>3</span>
                Reference
              </div>

            </div>

            <div className="form-section">

              <label className="big-label">
                What would you like to report?
              </label>

              <div className="input-type-grid">

                <button
                  type="button"
                  className={`input-type-card ${
                    inputType === "grievance"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setInputType("grievance")
                  }
                >
                  <span className="input-type-icon">
                    🏙️
                  </span>

                  <strong>
                    Civic Problem
                  </strong>

                  <span>
                    Roads, garbage, water, lights,
                    drainage and other public issues.
                  </span>

                </button>

                <button
                  type="button"
                  className={`input-type-card ${
                    inputType === "government_order"
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setInputType(
                      "government_order"
                    )
                  }
                >
                  <span className="input-type-icon">
                    🏛️
                  </span>

                  <strong>
                    Government Order
                  </strong>

                  <span>
                    For authorized administrative
                    submissions.
                  </span>

                </button>

              </div>

            </div>

            <div className="form-section">

              <label
                className="big-label"
                htmlFor="complaint"
              >
                {isGovernmentOrder
                  ? "Enter government order"
                  : "Describe the problem"}
              </label>

              <p className="field-help">
                {isGovernmentOrder
                  ? "Paste the order or administrative directive."
                  : "Use your own words. Tell us what happened and how it is affecting the area."}
              </p>

              <textarea
                id="complaint"
                className="complaint-textarea"
                value={complaint}
                onChange={(e) =>
                  setComplaint(e.target.value)
                }
                placeholder={
                  isGovernmentOrder
                    ? "Paste the government order here..."
                    : "Example: The street light near our school has not been working for a week..."
                }
                rows={7}
              />

              {!isGovernmentOrder && (
                <div className="character-help">
                  {complaint.length} characters
                </div>
              )}

            </div>

            {!isGovernmentOrder && (

              <>

                <div className="form-section">

                  <label
                    className="big-label"
                    htmlFor="location"
                  >
                    Where is the problem?
                  </label>

                  <p className="field-help">
                    Enter the street, area, landmark or locality.
                  </p>

                  <input
                    id="location"
                    className="form-input"
                    value={location}
                    onChange={(e) =>
                      setLocation(e.target.value)
                    }
                    placeholder="Example: Anna Nagar, Chennai"
                  />

                </div>

                <div className="form-section">

                  <label className="big-label">
                    Add a photo
                    <span className="optional-label">
                      Optional
                    </span>
                  </label>

                  <p className="field-help">
                    A photo can help officials understand the
                    problem faster.
                  </p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden-file-input"
                    onChange={(e) =>
                      handleProofImage(
                        e.target.files?.[0]
                      )
                    }
                  />

                  {!proofImage ? (

                    <button
                      type="button"
                      className="photo-upload-box"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                    >
                      <span className="photo-upload-icon">
                        📷
                      </span>

                      <strong>
                        Upload a photo
                      </strong>

                      <span>
                        JPG, PNG or WEBP • Maximum 5 MB
                      </span>
                    </button>

                  ) : (

                    <div className="photo-preview-box">

                      <img
                        src={proofImage}
                        alt="Complaint evidence"
                      />

                      <div>
                        <strong>
                          Photo attached
                        </strong>

                        <span>
                          {proofImageName}
                        </span>

                        <button
                          type="button"
                          className="remove-photo-button"
                          onClick={
                            removeProofImage
                          }
                        >
                          Remove photo
                        </button>
                      </div>

                    </div>

                  )}

                </div>

              </>

            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            <div className="form-actions">

              <button
                type="submit"
                className="submit-complaint-button"
                disabled={loading}
              >
                {loading
                  ? "Processing..."
                  : isGovernmentOrder
                  ? "Review Government Order"
                  : "Submit Complaint"}
                {!loading && <span>→</span>}
              </button>

              {!isGovernmentOrder && (

                <button
                  type="button"
                  className="example-button"
                  onClick={loadGrievanceExample}
                >
                  Try a sample complaint
                </button>

              )}

              {isGovernmentOrder && (

                <button
                  type="button"
                  className="example-button"
                  onClick={
                    loadGovernmentOrderExample
                  }
                >
                  Load sample order
                </button>

              )}

            </div>

            {!isGovernmentOrder && (

              <button
                type="button"
                className="officer-mode-link"
                onClick={() =>
                  setInputType(
                    "government_order"
                  )
                }
              >
                Authorized government order access →
              </button>

            )}

            {isGovernmentOrder && (

              <button
                type="button"
                className="officer-mode-link"
                onClick={() =>
                  setInputType("grievance")
                }
              >
                ← Back to citizen complaint
              </button>

            )}

          </form>

        ) : (

          <div className="submission-result">

            <div className="result-success-banner">

              <div className="result-success-icon">
                ✓
              </div>

              <div>
                <span className="section-tag">
                  SUBMISSION RECEIVED
                </span>

                <h2>
                  Your complaint has been registered
                </h2>

                <p>
                  Please save the Case ID below.
                  You will need it to track progress.
                </p>
              </div>

            </div>

            <div className="case-success-card">

              <span>
                YOUR CASE ID
              </span>

              <strong>
                {analysis.case_id}
              </strong>

              <p>
                Keep this reference number safe.
              </p>

            </div>

            <div className="result-meta-grid">

              <div>
                <span>Status</span>
                <strong>Registered</strong>
              </div>

              <div>
                <span>Issues identified</span>
                <strong>
                  {(analysis.issues || []).length}
                </strong>
              </div>

              <div>
                <span>Priority</span>
                <strong
                  className={getPriorityClass(
                    analysis.overall_priority
                  )}
                >
                  {analysis.overall_priority ||
                    "MEDIUM"}
                </strong>
              </div>

              <div>
                <span>Photo evidence</span>
                <strong>
                  {analysis.proofImage
                    ? "Attached"
                    : "Not attached"}
                </strong>
              </div>

            </div>

            <div className="citizen-result-message">

              <strong>
                What happens next?
              </strong>

              <p>
                Your complaint will be directed to
                the relevant department. You can use
                your Case ID to follow its progress.
              </p>

            </div>

            <div className="result-actions">

              <button
                className="primary-button"
                onClick={() =>
                  openTracking(analysis.case_id)
                }
              >
                Track This Complaint
                <span>→</span>
              </button>

              <button
                className="secondary-button"
                onClick={closeForm}
              >
                Done
              </button>

            </div>

          </div>

        )}

      </div>
    </div>
  );
}

/* =========================================================
   MAIN APP
========================================================= */

function App() {
  const [showForm, setShowForm] =
    useState(false);

  const [showTracking, setShowTracking] =
    useState(false);

  const [showOfficerAuth, setShowOfficerAuth] =
    useState(false);

  const [officerSession, setOfficerSession] =
    useState(() => {
      try {
        const saved =
          sessionStorage.getItem(
            "civicflow_officer_session"
          );

        return saved
          ? JSON.parse(saved)
          : null;
      } catch {
        return null;
      }
    });

  const [officerAuthenticated, setOfficerAuthenticated] =
    useState(() => {
      try {
        return Boolean(
          sessionStorage.getItem(
            "civicflow_officer_session"
          )
        );
      } catch {
        return false;
      }
    });

  const [complaint, setComplaint] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [inputType, setInputType] =
    useState("grievance");

  const [analysis, setAnalysis] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [routed, setRouted] =
    useState(false);

  const [proofImage, setProofImage] =
    useState("");

  const [proofImageName, setProofImageName] =
    useState("");

  const fileInputRef = {
    current: null,
  };

  const [trackedCases, setTrackedCases] =
    useState(() => {
      try {
        return JSON.parse(
          localStorage.getItem(
            "civicflow_cases"
          ) || "[]"
        );
      } catch {
        return [];
      }
    });

  const [trackingCaseId, setTrackingCaseId] =
    useState("");

  const [searchedCase, setSearchedCase] =
    useState(null);

  const [trackingError, setTrackingError] =
    useState("");

  const [trackingView, setTrackingView] =
    useState("citizen");

  /*
  ---------------------------------------------------------
  CASE STORAGE
  ---------------------------------------------------------
  */

  const saveCases = (cases) => {
    try {
      localStorage.setItem(
        "civicflow_cases",
        JSON.stringify(cases)
      );

      setTrackedCases(cases);

      return true;
    } catch (storageError) {
      console.error(storageError);

      setError(
        "The browser could not store this case. Please use a smaller image."
      );

      return false;
    }
  };

  /*
  ---------------------------------------------------------
  FORM
  ---------------------------------------------------------
  */

  const openForm = () => {
    setShowForm(true);
    setShowTracking(false);
    setShowOfficerAuth(false);
    setAnalysis(null);
    setError("");
    setRouted(false);
    setInputType("grievance");
  };

  const closeForm = () => {
    if (!loading) {
      setShowForm(false);
      setAnalysis(null);
      setError("");
      setRouted(false);
    }
  };

  const resetForm = () => {
    setComplaint("");
    setLocation("");
    setProofImage("");
    setProofImageName("");
    setAnalysis(null);
    setError("");
    setRouted(false);
    setInputType("grievance");
  };

  /*
  ---------------------------------------------------------
  PHOTO
  ---------------------------------------------------------
  */

  const handleProofImage = (file) => {
    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid image file."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image must be smaller than 5 MB."
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const originalImage =
        new Image();

      originalImage.onload = () => {
        const maxDimension = 1280;

        const largestDimension =
          Math.max(
            originalImage.width,
            originalImage.height
          );

        const scale =
          largestDimension > maxDimension
            ? maxDimension /
              largestDimension
            : 1;

        const width = Math.round(
          originalImage.width * scale
        );

        const height = Math.round(
          originalImage.height * scale
        );

        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width = width;
        canvas.height = height;

        const context =
          canvas.getContext("2d");

        if (!context) {
          setError(
            "Unable to process the image."
          );
          return;
        }

        context.drawImage(
          originalImage,
          0,
          0,
          width,
          height
        );

        const compressedImage =
          canvas.toDataURL(
            "image/jpeg",
            0.78
          );

        setProofImage(
          compressedImage
        );

        setProofImageName(
          file.name
        );
      };

      originalImage.onerror = () => {
        setError(
          "Unable to read the selected image."
        );
      };

      originalImage.src =
        event.target.result;
    };

    reader.onerror = () => {
      setError(
        "Unable to read the selected image."
      );
    };

    reader.readAsDataURL(file);
  };

  const removeProofImage = () => {
    setProofImage("");
    setProofImageName("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /*
  ---------------------------------------------------------
  SAMPLE COMPLAINT
  ---------------------------------------------------------
  */

  const loadGrievanceExample = () => {
    setInputType("grievance");

    setComplaint(SAMPLE_COMPLAINT);

    setLocation(
      "Green Park Colony, Chennai"
    );

    setProofImage("");
    setProofImageName("");
    setAnalysis(null);
    setError("");
    setRouted(false);
  };

  /*
  ---------------------------------------------------------
  SAMPLE GOVERNMENT ORDER
  ---------------------------------------------------------
  */

  const loadGovernmentOrderExample = () => {
    setInputType(
      "government_order"
    );

    setComplaint(
      "District Collector Order: The Municipal Administration Department shall remove accumulated garbage from Ward 12 within 3 days. The Electricity Department shall restore all non-functional street lights in Ward 12 within 7 days. The Roads & Highways Department shall repair the damaged road near Government Higher Secondary School within 10 days. The concerned officials shall submit a completion report to the District Collector."
    );

    setLocation("");
    setProofImage("");
    setProofImageName("");
    setAnalysis(null);
    setError("");
    setRouted(false);
  };

  /*
  ---------------------------------------------------------
  REGISTER CASE
  ---------------------------------------------------------
  */

  const registerCase = (
    analysisData,
    caseMeta = {}
  ) => {
    if (!analysisData) return null;

    const newCaseId =
      generateCaseId();

    const issues =
      Array.isArray(
        analysisData.issues
      )
        ? analysisData.issues
        : [];

    const departmentTasks =
      createDepartmentTasks(
        issues
      );

    const overallStatus =
      calculateOverallStatus(
        departmentTasks
      );

    const newCase = {
      id: newCaseId,

      analysisId:
        analysisData.analysis_id ||
        `${Date.now()}`,

      createdAt:
        new Date().toISOString(),

      type:
        analysisData.input_type ===
        "government_order"
          ? "Government Order"
          : "Citizen Grievance",

      status: overallStatus,

      priority:
        analysisData.overall_priority ||
        "MEDIUM",

      summary:
        analysisData.summary ||
        "No summary available.",

      complaint:
        analysisData.originalComplaint ||
        complaint,

      location:
        caseMeta.location ||
        "",

      proofImage:
        caseMeta.proofImage ||
        "",

      proofImageName:
        caseMeta.proofImageName ||
        "",

      issues,

      departments:
        departmentTasks,

      departmentTasks,
    };

    const updatedCases = [
      newCase,
      ...trackedCases,
    ];

    const saved =
      saveCases(updatedCases);

    if (!saved) return null;

    return newCase;
  };

  /*
  ---------------------------------------------------------
  SUBMIT / AI ANALYSIS
  ---------------------------------------------------------
  */

  const analyzeComplaint = async (
    event
  ) => {
    event?.preventDefault();

    setError("");

    if (!complaint.trim()) {
      setError(
        inputType ===
          "government_order"
          ? "Please enter the government order."
          : "Please describe the civic problem."
      );
      return;
    }

    if (complaint.trim().length < 10) {
      setError(
        "Please provide a little more detail so the submission can be understood clearly."
      );
      return;
    }

    if (
      inputType === "grievance" &&
      !location.trim()
    ) {
      setError(
        "Please enter the location where the problem is happening."
      );
      return;
    }

    setLoading(true);
    setError("");
    setAnalysis(null);
    setRouted(false);

    try {
      const complaintForAI =
        inputType === "grievance" &&
        location.trim()
          ? `${complaint.trim()}\n\nLocation: ${location.trim()}`
          : complaint.trim();

      const response =
        await fetch(API_URL, {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            complaint:
              complaintForAI,

            inputType,
          }),
        });

      let data;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.details ||
            data?.error ||
            "Unable to process your submission."
        );
      }

      const normalized =
        normalizeResult(
          data,
          complaint.trim(),
          location.trim(),
          proofImage
        );

      const registeredCase =
        registerCase(
          {
            ...normalized,

            input_type:
              inputType,

            originalComplaint:
              complaint.trim(),
          },
          {
            location:
              inputType ===
              "government_order"
                ? ""
                : location.trim(),

            proofImage:
              inputType ===
              "government_order"
                ? ""
                : proofImage,

            proofImageName:
              inputType ===
              "government_order"
                ? ""
                : proofImageName,
          }
        );

      if (!registeredCase) {
        throw new Error(
          "The submission was processed, but the case could not be saved."
        );
      }

      setAnalysis({
        ...normalized,

        case_id:
          registeredCase.id,

        input_type:
          inputType,

        location:
          registeredCase.location,

        proofImage:
          registeredCase.proofImage,

        proofImageName:
          registeredCase.proofImageName,

        departmentTasks:
          registeredCase.departmentTasks ||
          [],
      });

      setRouted(true);
    } catch (err) {
      console.error(
        "CivicFlow error:",
        err
      );

      setError(
        err?.message ||
          "Unable to connect to CivicFlow services. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  ---------------------------------------------------------
  TRACKING
  ---------------------------------------------------------
  */

  const openTracking = (
    prefillId = ""
  ) => {
    setShowTracking(true);
    setShowForm(false);
    setShowOfficerAuth(false);
    setTrackingView("citizen");
    setTrackingCaseId(prefillId);
    setTrackingError("");
    setSearchedCase(null);

    if (prefillId) {
      const foundCase =
        trackedCases.find(
          (item) =>
            String(item.id).toUpperCase() ===
            String(prefillId).toUpperCase()
        );

      if (foundCase) {
        setSearchedCase(foundCase);
      } else {
        setTrackingError(
          "Case ID not found. Please check the reference number."
        );
      }
    }
  };

  const closeTracking = () => {
    setShowTracking(false);
    setTrackingCaseId("");
    setSearchedCase(null);
    setTrackingError("");
  };

  const searchCase = () => {
    const enteredId =
      trackingCaseId
        .trim()
        .toUpperCase();

    if (!enteredId) {
      setTrackingError(
        "Please enter your Case ID."
      );
      setSearchedCase(null);
      return;
    }

    const foundCase =
      trackedCases.find(
        (item) =>
          String(item.id).toUpperCase() ===
          enteredId
      );

    if (!foundCase) {
      setTrackingError(
        "We could not find a complaint with that Case ID."
      );
      setSearchedCase(null);
      return;
    }

    setTrackingError("");
    setSearchedCase(foundCase);
  };

  /*
  ---------------------------------------------------------
  OFFICER PORTAL
  ---------------------------------------------------------
  */

  const openOfficerConsole = () => {
    if (!officerAuthenticated) {
      setShowOfficerAuth(true);
      return;
    }

    setShowTracking(true);
    setShowForm(false);
    setShowOfficerAuth(false);
    setTrackingView("officer");
    setTrackingError("");
    setSearchedCase(null);
    setTrackingCaseId("");
  };

  const handleOfficerAuthenticated = (
    sessionData
  ) => {
    const session = {
      officerId:
        sessionData?.officerId ||
        "officer01",

      loginTime:
        new Date().toISOString(),
    };

    sessionStorage.setItem(
      "civicflow_officer_session",
      JSON.stringify(session)
    );

    setOfficerSession(session);
    setOfficerAuthenticated(true);
    setShowOfficerAuth(false);
    setShowTracking(true);
    setShowForm(false);
    setTrackingView("officer");
  };

  const signOutOfficer = () => {
    sessionStorage.removeItem(
      "civicflow_officer_session"
    );

    setOfficerAuthenticated(false);
    setOfficerSession(null);
    setTrackingView("citizen");
    setSearchedCase(null);
    setTrackingCaseId("");
    setShowTracking(false);
  };

  /*
  ---------------------------------------------------------
  UPDATE DEPARTMENT TASK
  ---------------------------------------------------------
  */

  const updateDepartmentTaskStatus = (
    caseId,
    taskIndex,
    newStatus
  ) => {
    const updatedCases =
      trackedCases.map(
        (caseItem) => {

          if (
            caseItem.id !== caseId
          ) {
            return caseItem;
          }

          const updatedDepartments =
            (
              caseItem.departments ||
              []
            ).map(
              (task, index) => {

                if (
                  index !== taskIndex
                ) {
                  return task;
                }

                return {
                  ...task,
                  status: newStatus,
                  updatedAt:
                    new Date().toISOString(),
                };
              }
            );

          const overallStatus =
            calculateOverallStatus(
              updatedDepartments
            );

          return {
            ...caseItem,

            departments:
              updatedDepartments,

            departmentTasks:
              updatedDepartments,

            status:
              overallStatus,
          };
        }
      );

    saveCases(updatedCases);

    if (
      searchedCase &&
      searchedCase.id === caseId
    ) {
      const refreshed =
        updatedCases.find(
          (item) =>
            item.id === caseId
        );

      setSearchedCase(
        refreshed || null
      );
    }
  };

  /*
  ---------------------------------------------------------
  DELETE CASE
  ---------------------------------------------------------
  */

  const deleteCase = (caseId) => {
    const confirmed =
      window.confirm(
        "Remove this prototype case from local storage?"
      );

    if (!confirmed) return;

    const updatedCases =
      trackedCases.filter(
        (item) =>
          item.id !== caseId
      );

    saveCases(updatedCases);

    if (
      searchedCase?.id === caseId
    ) {
      setSearchedCase(null);
    }
  };

  /*
  ---------------------------------------------------------
  OFFICER STATISTICS
  ---------------------------------------------------------
  */

  const officerStats =
    useMemo(() => {

      let totalTasks = 0;
      let assigned = 0;
      let inProgress = 0;
      let resolved = 0;

      trackedCases.forEach(
        (caseItem) => {

          const departments =
            Array.isArray(
              caseItem.departments
            )
              ? caseItem.departments
              : [];

          departments.forEach(
            (task) => {

              totalTasks++;

              if (
                task.status ===
                "Assigned"
              ) {
                assigned++;
              }

              if (
                task.status ===
                "In Progress"
              ) {
                inProgress++;
              }

              if (
                task.status ===
                "Resolved"
              ) {
                resolved++;
              }
            }
          );
        }
      );

      return {
        totalCases:
          trackedCases.length,

        totalTasks,

        assigned,

        inProgress,

        resolved,
      };

    }, [trackedCases]);

  /*
  ---------------------------------------------------------
  HOME
  ---------------------------------------------------------
  */

  const goHome = () => {
    setShowForm(false);
    setShowTracking(false);
    setShowOfficerAuth(false);
    setSearchedCase(null);
    setTrackingError("");
  };

  return (
    <div className="app">

      {/* =================================================
          TOP GOVERNMENT BAR
      ================================================= */}

      <div className="official-bar">
        <div className="official-bar-inner">
          <span>
            CITIZEN PUBLIC SERVICE PORTAL
          </span>

          <span className="official-right">
            CivicFlow • Digital Civic Assistance
          </span>
        </div>
      </div>

      {/* =================================================
          NAVIGATION
      ================================================= */}

      <header className="navbar">

        <button
          className="logo"
          onClick={goHome}
          aria-label="CivicFlow home"
        >

          <div className="logo-icon">
            CF
          </div>

          <div className="logo-content">
            <strong>
              CivicFlow
            </strong>

            <span>
              PUBLIC SERVICE PORTAL
            </span>
          </div>

        </button>

        <nav className="nav-links">

          <a
            href="#home"
            onClick={goHome}
          >
            Home
          </a>

          <a href="#how-it-works">
            How It Works
          </a>

          <a href="#services">
            Services
          </a>

          <button
            className="nav-button"
            onClick={() =>
              openTracking()
            }
          >
            Track Complaint
          </button>

          <button
            className="nav-officer"
            onClick={
              openOfficerConsole
            }
          >
            Officer Portal
          </button>

          <button
            className="nav-primary"
            onClick={openForm}
          >
            Report a Problem
          </button>

        </nav>

      </header>

      {/* =================================================
          HERO
      ================================================= */}

      <main>

        <section
          className="hero"
          id="home"
        >

          <div className="hero-content">

            <div className="badge">
              <span className="status-dot" />
              DIGITAL CIVIC SERVICE
            </div>

            <h1>
              Your problem.
              <br />

              <span>
                Our responsibility to route it.
              </span>
            </h1>

            <p>
              Report problems in your neighbourhood
              such as damaged roads, garbage,
              street lights, drainage, water supply
              and other public-service issues.
            </p>

            <div className="hero-buttons">

              <button
                className="primary-button hero-primary"
                onClick={openForm}
              >
                Report a Problem
                <span>→</span>
              </button>

              <button
                className="secondary-button hero-secondary"
                onClick={() =>
                  openTracking()
                }
              >
                Track My Complaint
              </button>

            </div>

            <div className="simple-trust">

              <span>✓</span>
              Simple submission

              <span>✓</span>
              Photo evidence

              <span>✓</span>
              Case reference

              <span>✓</span>
              Status tracking

            </div>

          </div>

          {/* PROFESSIONAL PUBLIC SERVICE PANEL */}

          <div className="hero-service-panel">

            <div className="service-panel-top">

              <div className="service-panel-mark">
                CF
              </div>

              <div>
                <span>
                  CIVICFLOW
                </span>

                <strong>
                  Public Service Desk
                </strong>
              </div>

            </div>

            <div className="service-panel-main">

              <span className="service-panel-label">
                ONE SIMPLE PROCESS
              </span>

              <h2>
                Tell us what is wrong.
              </h2>

              <p>
                You do not need to identify the
                government department. CivicFlow
                helps route your complaint to the
                relevant service area.
              </p>

            </div>

            <div className="service-panel-items">

              <div>
                <span>01</span>
                <strong>
                  Submit
                </strong>
                <p>
                  Describe the issue
                </p>
              </div>

              <div>
                <span>02</span>
                <strong>
                  Route
                </strong>
                <p>
                  Identify the department
                </p>
              </div>

              <div>
                <span>03</span>
                <strong>
                  Track
                </strong>
                <p>
                  Follow the progress
                </p>
              </div>

            </div>

          </div>

        </section>

        {/* =================================================
            TRUST STRIP
        ================================================= */}

        <section className="public-trust-strip">

          <div>
            <strong>
              Built for citizens
            </strong>

            <span>
              Clear and simple reporting
            </span>
          </div>

          <div>
            <strong>
              Department routing
            </strong>

            <span>
              Problems are directed appropriately
            </span>
          </div>

          <div>
            <strong>
              Transparent tracking
            </strong>

            <span>
              Follow your case using its reference ID
            </span>
          </div>

        </section>

        {/* =================================================
            HOW IT WORKS
        ================================================= */}

        <section
          id="how-it-works"
          className="section light-section"
        >

          <div className="section-heading">

            <div className="section-tag">
              HOW IT WORKS
            </div>

            <h2>
              Getting help should be simple.
            </h2>

            <p>
              CivicFlow removes the need to know
              which government department handles
              your problem.
            </p>

          </div>

          <div className="simple-steps">

            <div className="simple-step">

              <div className="simple-step-number">
                01
              </div>

              <div className="simple-step-icon">
                📝
              </div>

              <span>
                REPORT
              </span>

              <h3>
                Tell us what happened
              </h3>

              <p>
                Describe the civic problem using
                simple words and provide its location.
              </p>

            </div>

            <div className="simple-step">

              <div className="simple-step-number">
                02
              </div>

              <div className="simple-step-icon">
                🏛️
              </div>

              <span>
                ROUTE
              </span>

              <h3>
                We identify the right department
              </h3>

              <p>
                CivicFlow analyses the complaint and
                helps direct each issue to the relevant
                public-service department.
              </p>

            </div>

            <div className="simple-step">

              <div className="simple-step-number">
                03
              </div>

              <div className="simple-step-icon">
                📊
              </div>

              <span>
                TRACK
              </span>

              <h3>
                Follow the progress
              </h3>

              <p>
                Use your Case ID to see the current
                progress of your complaint.
              </p>

            </div>

          </div>

        </section>

        {/* =================================================
            SERVICES
        ================================================= */}

        <section
          id="services"
          className="section"
        >

          <div className="section-heading">

            <div className="section-tag">
              PUBLIC SERVICES
            </div>

            <h2>
              What can you report?
            </h2>

            <p>
              Report common problems affecting
              your neighbourhood and public services.
            </p>

          </div>

          <div className="service-grid">

            <div className="service-card">
              <span>🛣️</span>
              <h3>
                Roads & Highways
              </h3>
              <p>
                Potholes, damaged roads and unsafe
                road conditions.
              </p>
            </div>

            <div className="service-card">
              <span>🗑️</span>
              <h3>
                Sanitation
              </h3>
              <p>
                Garbage collection, waste and
                cleanliness issues.
              </p>
            </div>

            <div className="service-card">
              <span>💡</span>
              <h3>
                Street Lighting
              </h3>
              <p>
                Non-working street lights and
                public lighting problems.
              </p>
            </div>

            <div className="service-card">
              <span>💧</span>
              <h3>
                Water Supply
              </h3>
              <p>
                Water supply interruptions,
                leakage and related issues.
              </p>
            </div>

            <div className="service-card">
              <span>🚰</span>
              <h3>
                Drainage
              </h3>
              <p>
                Blocked drains, wastewater and
                overflow problems.
              </p>
            </div>

            <div className="service-card">
              <span>🏥</span>
              <h3>
                Public Health
              </h3>
              <p>
                Civic conditions affecting
                public health and safety.
              </p>
            </div>

            <div className="service-card">
              <span>🌱</span>
              <h3>
                Environment
              </h3>
              <p>
                Public environmental concerns
                and local issues.
              </p>
            </div>

            <div className="service-card">
              <span>🏛️</span>
              <h3>
                Other Civic Services
              </h3>
              <p>
                Other public-service problems
                can also be submitted.
              </p>
            </div>

          </div>

        </section>

        {/* =================================================
            CALL TO ACTION
        ================================================= */}

        <section className="final-cta">

          <div>

            <span className="section-tag">
              HAVE A CIVIC PROBLEM?
            </span>

            <h2>
              Your report can help improve
              your neighbourhood.
            </h2>

            <p>
              Submit the issue. Keep your Case ID.
              Follow the progress.
            </p>

          </div>

          <div className="final-cta-actions">

            <button
              className="primary-button"
              onClick={openForm}
            >
              Report a Problem
              <span>→</span>
            </button>

            <button
              className="secondary-button"
              onClick={() =>
                openTracking()
              }
            >
              Track Complaint
            </button>

          </div>

        </section>

      </main>

      {/* =================================================
          FOOTER
      ================================================= */}

      <footer className="footer">

        <div className="footer-main">

          <div className="footer-brand">

            <div className="logo-icon">
              CF
            </div>

            <div>
              <strong>
                CivicFlow
              </strong>

              <span>
                Citizen Public Service Portal
              </span>
            </div>

          </div>

          <p>
            A digital platform for simpler civic
            complaint reporting, department routing
            and transparent case tracking.
          </p>

        </div>

        <div className="footer-links">

          <button onClick={openForm}>
            Report a Problem
          </button>

          <button
            onClick={() =>
              openTracking()
            }
          >
            Track Complaint
          </button>

          <button
            onClick={
              openOfficerConsole
            }
          >
            Officer Portal
          </button>

        </div>

        <div className="footer-bottom">

          <span>
            © {new Date().getFullYear()} CivicFlow
          </span>

          <span>
            Hackathon Prototype • Public Service Portal
          </span>

        </div>

      </footer>

      {/* =================================================
          MODALS
      ================================================= */}

      {showForm && (

        <ComplaintModal
          complaint={complaint}
          setComplaint={setComplaint}
          location={location}
          setLocation={setLocation}
          inputType={inputType}
          setInputType={setInputType}
          proofImage={proofImage}
          proofImageName={proofImageName}
          fileInputRef={fileInputRef}
          handleProofImage={handleProofImage}
          removeProofImage={removeProofImage}
          error={error}
          loading={loading}
          analysis={analysis}
          openTracking={openTracking}
          analyzeComplaint={analyzeComplaint}
          closeForm={closeForm}
          loadGrievanceExample={
            loadGrievanceExample
          }
          loadGovernmentOrderExample={
            loadGovernmentOrderExample
          }
        />

      )}

      {showTracking && (

        <CaseTrackingDashboard
          trackedCases={trackedCases}
          trackingView={trackingView}
          setTrackingView={setTrackingView}
          trackingCaseId={trackingCaseId}
          setTrackingCaseId={
            setTrackingCaseId
          }
          searchedCase={searchedCase}
          trackingError={trackingError}
          searchCase={searchCase}
          closeTracking={closeTracking}
          updateDepartmentTaskStatus={
            updateDepartmentTaskStatus
          }
          deleteCase={deleteCase}
          officerAuthenticated={
            officerAuthenticated
          }
          officerSession={officerSession}
          signOutOfficer={
            signOutOfficer
          }
        />

      )}

      {showOfficerAuth && (

        <OfficerAuthentication
          onSuccess={
            handleOfficerAuthenticated
          }
          onClose={() =>
            setShowOfficerAuth(false)
          }
        />

      )}

    </div>
  );
}

export default App;