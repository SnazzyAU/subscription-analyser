import React, { useState } from "react";
import "./App.css";
import AdsenseAd from "./components/AdsenseAd";  // ✅ import your ad component

const SUBSCRIPTION_KEYWORDS = [
  "netflix", "prime video", "amznprimeau", "kogan mobile", "belong",
  "apple.com/bill", "aussie broadband", "spotify", "stan", "disney", "paramount", "binge"
];

const SERVICE_CATEGORIES = {
  Streaming: ["Netflix", "Prime Video", "Disney", "Binge", "Stan", "Paramount"],
  Internet: ["Kogan Mobile", "Belong", "Aussie Broadband"],
  Shopping: ["Apple.com/bill", "Amznprimeau"],
  Music: ["Spotify"]
};

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeTab, setActiveTab] = useState("analysis");
  const [selectedCancellations, setSelectedCancellations] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const handleFileUpload = async (e) => {
    const input = e.target;
    const file = input.files[0];
    input.value = null;
    if (!file) return;

    setLoading(true);
    setError("");
    setTransactions([]);
    setGrouped({});
    setTotal(0);
    setActiveTab("analysis");
    setSelectedCancellations([]);
    setFavorites([]);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
      if (lines.length <= 1) throw new Error("CSV file appears empty or only has headers.");
      const dataLines = lines.slice(1);

      const parsed = [];
      for (let i = 0; i < dataLines.length; i++) {
        const parts = dataLines[i].split(",");
        if (parts.length < 3) continue;

        const date = parts[0].trim();
        let amountRaw = parts[1].trim();
        let description = parts[2].toLowerCase().trim();

        const amount = parseFloat(amountRaw.replace(/[^0-9.-]/g, ""));
        if (isNaN(amount)) continue;
        const keyword = SUBSCRIPTION_KEYWORDS.find(k => description.includes(k));
        if (!keyword) continue;
        if (amount >= -1 && amount <= -1000) continue;

        parsed.push({
          date,
          service: toTitleCase(keyword),
          amount: Math.abs(amount),
          rawLine: dataLines[i],
        });
      }

      if (parsed.length === 0) {
        setError("No subscriptions detected. Check keywords or CSV format.");
        setLoading(false);
        return;
      }

      setTransactions(parsed);
      const groupedByService = {};
      let totalSum = 0;
      parsed.forEach(item => {
        if (!groupedByService[item.service]) groupedByService[item.service] = [];
        groupedByService[item.service].push(item);
        totalSum += item.amount;
      });

      setGrouped(groupedByService);
      setTotal(totalSum);
    } catch (err) {
      console.error(err);
      setError(`Error reading CSV: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTransactions([]);
    setGrouped({});
    setTotal(0);
    setError("");
    setSelectedCategory("All");
    setActiveTab("analysis");
    setSelectedCancellations([]);
    setFavorites([]);
  };

  let filteredGrouped = Object.entries(grouped).filter(([service]) => {
    if (selectedCategory === "All") return true;
    return SERVICE_CATEGORIES[selectedCategory]?.includes(service);
  });

  const categoryTotal = filteredGrouped.reduce(
    (catSum, [, items]) => catSum + items.reduce((sum, t) => sum + t.amount, 0),
    0
  );

  let totalMonthlyFees = 0;
  let cancelOptions = [];

  const serviceCards = filteredGrouped.map(([service, items]) => {
    const amountCounts = {};
    items.forEach(t => {
      const key = t.amount.toFixed(2);
      amountCounts[key] = (amountCounts[key] || 0) + 1;
    });

    let likelyMonthly = null;
    let maxCount = 1;
    for (const [amountStr, count] of Object.entries(amountCounts)) {
      if (count > maxCount) {
        maxCount = count;
        likelyMonthly = parseFloat(amountStr);
      }
    }

    if (likelyMonthly) {
      totalMonthlyFees += likelyMonthly;

      if (!favorites.includes(toTitleCase(service))) {
        cancelOptions.push({ service: toTitleCase(service), monthlyFee: likelyMonthly });
      }
    }

    return (
      <div key={service} className="service-card">
        <h3>✅ {toTitleCase(service)}</h3>

        {favorites.includes(toTitleCase(service)) && (
          <div className="favorite-badge">⭐️ Must Keep</div>
        )}

        <button
          className={`favorite-button ${favorites.includes(toTitleCase(service)) ? 'favorited' : ''}`}
          onClick={() => toggleFavorite(toTitleCase(service))}
        >
          {favorites.includes(toTitleCase(service)) ? '⭐️ Unmark Favorite' : '☆ Mark Favorite'}
        </button>

        {likelyMonthly && (
          <div className="monthly-fee">
            📌 Likely Monthly Fee: <strong>${likelyMonthly.toFixed(2)}</strong> (repeats {maxCount} times)
          </div>
        )}

        <table className="transaction-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((t, idx) => (
              <tr key={idx}>
                <td>{t.date}</td>
                <td>${t.amount.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="service-total">
          ➜ Total for {toTitleCase(service)}: <strong>${items.reduce((sum, t) => sum + t.amount, 0).toFixed(2)}</strong>
        </div>
      </div>
    );
  });

  const toggleCancellation = (service) => {
    setSelectedCancellations(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const toggleFavorite = (service) => {
    setFavorites(prev =>
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };

  const estimatedSavings = cancelOptions
    .filter(opt => selectedCancellations.includes(opt.service))
    .reduce((sum, opt) => sum + opt.monthlyFee, 0);

  const estimatedYearlySavings = estimatedSavings * 12;

  const downloadCSV = () => {
    if (cancelOptions.length === 0) {
      alert("No estimated monthly fees to export.");
      return;
    }

    let csvContent = "Service,Monthly Fee\n";
    cancelOptions.forEach(item => {
      csvContent += `${item.service},${item.monthlyFee.toFixed(2)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "subscriptions.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="app-layout">
      <div className="sidebar left">
        <AdsenseAd slot="YOUR_LEFT_SLOT_ID_1" />
        <AdsenseAd slot="YOUR_LEFT_SLOT_ID_2" />
      </div>

      <div className="main-content">
        <header>
          <h1>📄 Subscription Analyzer</h1>
          <p className="subtitle">
            Upload your CSV bank export (with headers). We'll detect subscriptions automatically.
          </p>
        </header>

        <div className="upload-section">
          <label className="file-label">
            📎 Choose CSV File
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} />
          </label>
        </div>

        {transactions.length > 0 && (
          <>
            <div className="tabs">
              <button className={activeTab === "analysis" ? "active-tab" : ""} onClick={() => setActiveTab("analysis")}>
                📊 Analysis
              </button>
              <button className={activeTab === "planner" ? "active-tab" : ""} onClick={() => setActiveTab("planner")}>
                ✂️ Cancel Planner
              </button>
              <button className={activeTab === "export" ? "active-tab" : ""} onClick={() => setActiveTab("export")}>
                📋 Export
              </button>
            </div>

            {activeTab === "analysis" && (
              <div className="filter-section">
                <label htmlFor="category-select">Category:</label>
                <select
                  id="category-select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="All">All</option>
                  {Object.keys(SERVICE_CATEGORIES).map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {loading && <div className="status loading">🔎 Parsing CSV... please wait.</div>}
        {error && <div className="status error">{error}</div>}

        {!loading && serviceCards.length > 0 && (
          <div className="results">
            {activeTab === "analysis" && (
              <>
                <h2>🔔 Subscriptions Found:</h2>
                <div className="service-grid">{serviceCards}</div>
                <div className="total">
                  💰 <strong>Grand Total:</strong> ${total.toFixed(2)}
                  <div className="total-monthly-fees">
                    📌 <strong>Total Monthly Fees (estimated):</strong> ${totalMonthlyFees.toFixed(2)}
                  </div>
                </div>
              </>
            )}

            {activeTab === "planner" && (
              <>
                <h2>✂️ Cancel Planner</h2>
                <p>Select services to cancel and see your estimated savings:</p>
                <div className="cancel-grid">
                  {cancelOptions.map(({ service, monthlyFee }) => (
                    <div key={service} className="cancel-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={selectedCancellations.includes(service)}
                          onChange={() => toggleCancellation(service)}
                        />
                        {service} - ${monthlyFee.toFixed(2)}
                      </label>
                    </div>
                  ))}
                </div>
                <div className="total-savings">
                  📊 <strong>Current Monthly Expense:</strong> ${totalMonthlyFees.toFixed(2)}
                  <br />
                  ✅ <strong>Saved Monthly Expenses:</strong> ${estimatedSavings.toFixed(2)}
                  <br />
                  📅 <strong>Estimated Yearly Savings:</strong> ${estimatedYearlySavings.toFixed(2)}
                </div>
              </>
            )}

            {activeTab === "export" && (
              <div className="export-tab">
                <h2>📋 Export Subscriptions</h2>
                <p>Export your detected subscriptions and estimated monthly fees to CSV for budgeting or sharing.</p>
                <button className="export-button" onClick={downloadCSV}>⬇️ Download CSV</button>
                {cancelOptions.length > 0 && (
                  <div className="export-preview">
                    <h3>📌 Preview:</h3>
                    <table className="transaction-table">
                      <thead>
                        <tr>
                          <th>Service</th>
                          <th>Monthly Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cancelOptions.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.service}</td>
                            <td>${item.monthlyFee.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {cancelOptions.length === 0 && (
                  <p>No estimated monthly fees available yet. Try uploading a CSV first.</p>
                )}
              </div>
            )}
          </div>
        )}

        {!loading && transactions.length === 0 && !error && (
          <div className="status idle">
            No results yet. Upload a CSV above to get started.
          </div>
        )}

        <footer>
          <small>Made with ❤️ in React. Your data never leaves your device.</small>
        </footer>
      </div>

      <div className="sidebar right">
        <AdsenseAd slot="YOUR_RIGHT_SLOT_ID_1" />
        <AdsenseAd slot="YOUR_RIGHT_SLOT_ID_2" />
      </div>
    </div>
  );
}
