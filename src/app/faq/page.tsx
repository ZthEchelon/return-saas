const faqs = [
  {
    q: "How does Looply prevent missed return windows?",
    a: "We track purchase dates and return-by dates, then send reminders at 7, 3, and 1 day before the deadline.",
  },
  {
    q: "Can I control reminder timing?",
    a: "Yes. You can adjust lead times for returns, renewals, and bills in Settings.",
  },
  {
    q: "Do you scan my email?",
    a: "If you connect email, we only scan relevant receipts for subscriptions and returns. You can disconnect anytime.",
  },
  {
    q: "Is my data private?",
    a: "We only use your data to operate the service and never sell personal data. See our Privacy Policy for details.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-12 text-slate-900">
      <div>
        <h1 className="text-3xl font-bold">FAQ</h1>
        <p className="text-sm text-slate-700">Answers to the most common questions about Looply.</p>
      </div>
      <div className="space-y-4">
        {faqs.map(item => (
          <div key={item.q} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-900">{item.q}</p>
            <p className="mt-2 text-sm text-slate-700">{item.a}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
