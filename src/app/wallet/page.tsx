import { AppShell, Icon } from "../site";
import { ledger } from "../data";

export default function WalletPage() {
  return (
    <AppShell title="Time wallet">
      <div className="page-heading">
        <div className="eyebrow">TIME, KEPT FAIR</div>
        <h1>Your time wallet</h1>
        <p className="lead">Not money. Just hours, earned and shared.</p>
      </div>

      <div className="wallet-overview">
        <div className="wallet-large">
          <span className="wallet-card-top">AVAILABLE TO LEARN</span>
          <strong>6.25 <small>TC</small></strong>
          <span>1 TC = 1 hour of teaching</span>
          <div className="wallet-large-bottom">
            <span>Held for upcoming sessions</span>
            <b>1.50 TC</b>
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
        <button className="button button-quiet" type="button">Export statement <Icon name="arrow" size={15} /></button>
      </div>

      <div className="ledger-table">
        <div className="ledger-head"><span>ACTIVITY</span><span>DATE</span><span>AMOUNT</span></div>
        {ledger.map((item) => (
          <div className="ledger-row" key={item.title}>
            <span className={`ledger-icon ${item.kind}`}><Icon name={item.kind === "plus" ? "plus" : "clock"} size={16} /></span>
            <div className="ledger-name"><b>{item.title}</b><small>{item.detail}</small></div>
            <span className="ledger-date">{item.date}</span>
            <b className={`ledger-amount ${item.kind}`}>{item.amount} <small>TC</small></b>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
