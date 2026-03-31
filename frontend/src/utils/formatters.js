export const formatCurrency = (value, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(value ?? 0);

export const formatDate = (date) =>
  new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(date));

export const formatNumber = (n) =>
  new Intl.NumberFormat("en-IN").format(n ?? 0);

export const formatPercent = (n, decimals = 1) =>
  `${(n ?? 0).toFixed(decimals)}%`;