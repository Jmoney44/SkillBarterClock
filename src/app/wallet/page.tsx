"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, Icon } from "../site";

type WalletTransaction = {
  id: string;
  kind: "starter" | "hold" | "refund" | "earned";
  title: string;
  detail: string;
  amount: number | string;
  created_at: string;
};

type WalletData = {
  balance: number;
  pending: number;
  transactions: WalletTransaction[];
};

function formatAmount(amount: number | string) {
  const numericAmount = Number(amount);
  return `${numericAmount > 0 ? "+" : ""}${numericAmount.toFixed(2)}`;
}

export default function WalletPage() {
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWallet() {
      try {
        const response = await fetch("/api/wallet", { cache: "no-store" });
        const data = await response.json();
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        if (!response.ok) {
          setError(data.error || "Could not load your wallet.");
          return;
        }
        setWallet(data);
      } catch {
        setError("We couldn’t reach the server. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadWallet();
  }, [router]);

  function exportStatement() {
    if (!wallet) return;
    const rows = [
      ["Activity", "Details", "Date", "Amount (TC)"],
      ...wallet.transactions.map((item) => [
        item.title,
        item.detail,
        item.created_at,
        Number(item.amount).toFixed(2),
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "skill-barter-wallet.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AppShell title="Time wallet">
      <div className="page-heading">
        <div className="eyebrow">TIME, KEPT FAIR</div>
        <h1>Your time wallet</h1>
        <p className="lead">Not money. Just hours, earned and shared.</p>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <div className="wallet-overview">
        <div className="wallet-large">
          <span className="wallet-card-top">AVAILABLE TO LEARN</span>
          <strong>{loading ? "—" : (wallet?.balance ?? 0).toFixed(2)} <small>TC</small></strong>
          <span>1 TC = 1 hour of teaching</span>
          <div className="wallet-large-bottom">
            <span>Held for upcoming sessions</span>
            <b>{loading ? "—" : (wallet?.pending ?? 0).toFixed(2)} TC</b>
          </div>
        </div>

        <div className="wallet-info">
          <div className="eyebrow">HOW YOUR CREDITS WORK</div>
          <div className="credit-rule">
            <span className="rule-icon earned"><Icon name="plus" size={17} /></span>
            <div><b>Teach an hour, earn 1 TC</b><span>Every verified teaching hour adds to your available balance.</span></div>
          </div>
          <div className="credit-rule">
            <span className="rule-icon spent"><Icon name="clock" size={17} /></span>
            <div><b>Learn an hour, spend 1 TC</b><span>Credits are held when you book, then sent after you both confirm.</span></div>
          </div>
          <div className="credit-rule">
            <span className="rule-icon safe"><Icon name="shield" size={17} /></span>
            <div><b>Credits are never money</b><span>They can’t be bought, sold, or exchanged outside the community.</span></div>
          </div>
        </div>
      </div>

      <div className="ledger-heading">
        <div>
          <div className="eyebrow">EVERY HOUR, ACCOUNTED FOR</div>
          <h3>Wallet activity</h3>
        </div>
        <button className="button button-quiet" type="button" onClick={exportStatement} disabled={!wallet?.transactions.length}>
          Export statement <Icon name="arrow" size={15} />
        </button>
      </div>

      <div className="ledger-table">
        <div className="ledger-head"><span>ACTIVITY</span><span>DATE</span><span>AMOUNT</span></div>
        {wallet?.transactions.map((item) => {
          const isHold = item.kind === "hold";
          return (
            <div className="ledger-row" key={item.id}>
              <span className={`ledger-icon ${isHold ? "hold" : "plus"}`}>
                <Icon name={isHold ? "clock" : "plus"} size={16} />
              </span>
              <div className="ledger-name"><b>{item.title}</b><small>{item.detail}</small></div>
              <span className="ledger-date">{new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.created_at))}</span>
              <b className={`ledger-amount ${isHold ? "hold" : "plus"}`}>{formatAmount(item.amount)} <small>TC</small></b>
            </div>
          );
        })}
        {!loading && !error && wallet?.transactions.length === 0 && (
          <div className="empty-hint"><Icon name="clock" /><span>Your wallet activity will appear here.</span></div>
        )}
      </div>
    </AppShell>
  );
}
