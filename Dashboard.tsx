import { useStore } from "@/lib/useStore";
import { fmt } from "@/lib/storage";
import { TrendingUp, TrendingDown, PiggyBank, AlertTriangle, Plus } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CategoryKey } from "@/lib/types";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function Dashboard() {
  const { state, totalIncome, addExpense, removeExpense } = useStore();
  const now = new Date();
  const month = now.toISOString().slice(0, 7);

  const monthExpenses = useMemo(
    () => state.expenses.filter(e => e.date.startsWith(month)),
    [state.expenses, month]
  );
  const totalSpent = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const remaining = totalIncome - totalSpent;

  const byCategory = state.categories.map(c => {
    const spent = monthExpenses.filter(e => e.category === c.key).reduce((s, e) => s + e.amount, 0);
    const budget = (totalIncome * c.percent) / 100;
    const pct = budget > 0 ? (spent / budget) * 100 : 0;
    return { ...c, spent, budget, pct };
  });

  const pieData = byCategory.filter(c => c.spent > 0).map(c => ({ name: c.name, value: c.spent, color: c.color }));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">مرحباً 👋</p>
          <h2 className="text-3xl md:text-4xl font-extrabold">
            ميزانية <span className="text-gradient-gold">شهر {now.toLocaleDateString("ar", { month: "long" })}</span>
          </h2>
        </div>
        <AddExpenseDialog onAdd={(e) => { addExpense(e); toast.success("تم تسجيل المصروف"); }} />
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="إجمالي الدخل"
          value={fmt(totalIncome, state.currency)}
          tone="primary"
        />
        <StatCard
          icon={<TrendingDown className="w-5 h-5" />}
          label="إجمالي المصروفات"
          value={fmt(totalSpent, state.currency)}
          tone="warning"
        />
        <StatCard
          icon={<PiggyBank className="w-5 h-5" />}
          label="المتبقي للادخار"
          value={fmt(remaining, state.currency)}
          tone={remaining < 0 ? "destructive" : "success"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass rounded-3xl p-6 shadow-card">
          <h3 className="font-bold text-lg mb-5">توزيع الميزانية حسب الفئات</h3>
          <div className="space-y-5">
            {byCategory.map(c => {
              const overBudget = c.pct >= 100;
              const warning = c.pct >= 80 && c.pct < 100;
              return (
                <div key={c.key}>
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: c.color }} />
                      <span className="font-semibold">{c.name}</span>
                      {overBudget && (
                        <span className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-full bg-destructive/20 text-destructive">
                          <AlertTriangle className="w-3 h-3" /> تجاوز
                        </span>
                      )}
                      {warning && (
                        <span className="text-[11px] flex items-center gap-1 px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                          <AlertTriangle className="w-3 h-3" /> اقترب
                        </span>
                      )}
                    </div>
                    <div className="text-sm">
                      <span className="num font-semibold">{fmt(c.spent, state.currency)}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="num text-muted-foreground">{fmt(c.budget, state.currency)}</span>
                    </div>
                  </div>
                  <Progress value={Math.min(c.pct, 100)} className="h-2.5" />
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass rounded-3xl p-6 shadow-card">
          <h3 className="font-bold text-lg mb-3">الإنفاق الشهري</h3>
          {pieData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-muted-foreground text-center">
              لا توجد مصروفات بعد. ابدأ بإضافة أول مصروف!
            </div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pieData} dataKey="value" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(220 28% 10%)", border: "1px solid hsl(220 20% 18%)", borderRadius: 12 }}
                    formatter={(v: number) => fmt(v, state.currency)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="glass rounded-3xl p-6 shadow-card">
        <h3 className="font-bold text-lg mb-4">آخر المصروفات</h3>
        {monthExpenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">لم تُسجل أي مصروفات هذا الشهر.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {monthExpenses.slice(0, 8).map(e => {
              const cat = state.categories.find(c => c.key === e.category);
              return (
                <li key={e.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat?.color }} />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{e.note || cat?.name}</p>
                      <p className="text-xs text-muted-foreground">{cat?.name} · {e.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="num font-bold">{fmt(e.amount, state.currency)}</span>
                    <button onClick={() => removeExpense(e.id)} className="text-xs text-muted-foreground hover:text-destructive transition-smooth">حذف</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "primary" | "warning" | "success" | "destructive" }) {
  const toneClass = {
    primary: "from-primary/20 to-primary/5 text-primary",
    warning: "from-warning/20 to-warning/5 text-warning",
    success: "from-success/20 to-success/5 text-success",
    destructive: "from-destructive/20 to-destructive/5 text-destructive",
  }[tone];
  return (
    <div className="glass rounded-3xl p-5 shadow-card relative overflow-hidden">
      <div className={`absolute -top-10 -left-10 w-32 h-32 rounded-full bg-gradient-to-br ${toneClass} blur-2xl opacity-60`} />
      <div className="relative">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br ${toneClass}`}>{icon}</span>
          <span>{label}</span>
        </div>
        <p className="num text-2xl md:text-3xl font-extrabold mt-3">{value}</p>
      </div>
    </div>
  );
}

function AddExpenseDialog({ onAdd }: { onAdd: (e: { date: string; amount: number; category: CategoryKey; note: string }) => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<CategoryKey>("needs");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const submit = () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("أدخل مبلغاً صحيحاً");
    onAdd({ amount: amt, category, note: note.trim().slice(0, 80), date });
    setAmount(""); setNote(""); setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="gradient-primary text-primary-foreground shadow-glow font-bold">
          <Plus className="w-5 h-5 ml-1" /> تسجيل مصروف
        </Button>
      </DialogTrigger>
      <DialogContent className="glass">
        <DialogHeader>
          <DialogTitle>تسجيل مصروف جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1.5 block">المبلغ</label>
            <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">الفئة</label>
            <Select value={category} onValueChange={(v) => setCategory(v as CategoryKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="needs">الاحتياجات الأساسية</SelectItem>
                <SelectItem value="wants">الترفيه والرغبات</SelectItem>
                <SelectItem value="savings">الادخار</SelectItem>
                <SelectItem value="investment">الاستثمار</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">التاريخ</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">ملاحظة (اختياري)</label>
            <Input value={note} onChange={e => setNote(e.target.value)} maxLength={80} placeholder="مثلاً: بقالة، بنزين..." />
          </div>
          <Button onClick={submit} className="w-full gradient-primary text-primary-foreground font-bold">حفظ</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
