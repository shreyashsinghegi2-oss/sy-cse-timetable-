import { ArrowRight, CalendarDays, Users, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge, Card, Progress } from "@/components/ui";

const skills = [["Data structures", 82], ["React & TypeScript", 64], ["SQL", 47], ["System design", 31]] as const;

function Widget({ title, to, children }: { title: string; to?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        {to && <Link to={to} className="text-xs text-sky-600 hover:underline">View all</Link>}
      </div>
      {children}
    </Card>
  );
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Good morning 👋</h1>
        <p className="mt-1 text-sm text-muted">Here is where you stand today.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs text-muted">Career readiness</p>
          <p className="mt-2 text-4xl font-semibold tracking-tight">68<span className="text-lg text-muted"> / 100</span></p>
          <Progress value={68} className="mt-4" />
          <p className="mt-3 text-xs text-muted">+6 this month</p>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted">Continue your roadmap</p>
              <h3 className="mt-1 text-lg font-semibold">Full-stack developer · Week 4</h3>
              <p className="mt-1 text-sm text-muted">Next: REST API project, step 2 of 5</p>
            </div>
            <Badge tone="sky">In progress</Badge>
          </div>
          <Progress value={40} className="mt-5" />
          <Link to="/app/career-compass" className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium">Resume <ArrowRight size={14} /></Link>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Widget title="Recommended opportunities" to="/app/opportunities">
          <ul className="divide-y divide-line">
            {[["Frontend Intern", "Pune · Remote", "Internship"], ["Backend Developer (Freelance)", "Fixed price", "Freelance"], ["Campus drive — Infosys", "Applications open", "Drive"]].map(([t, m, k]) => (
              <li key={t} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div><p className="text-sm font-medium">{t}</p><p className="text-xs text-muted">{m}</p></div>
                <Badge>{k}</Badge>
              </li>
            ))}
          </ul>
        </Widget>
        <Widget title="Skill progress" to="/app/career-compass">
          <div className="space-y-3.5">
            {skills.map(([n, v]) => (
              <div key={n}>
                <div className="mb-1.5 flex justify-between text-xs"><span>{n}</span><span className="text-muted">{v}%</span></div>
                <Progress value={v} />
              </div>
            ))}
          </div>
        </Widget>
        <Widget title="Upcoming events" to="/app/events">
          <div className="flex items-center gap-3"><CalendarDays size={18} className="text-sky-600" /><div><p className="text-sm font-medium">Campus hackathon kickoff</p><p className="text-xs text-muted">Sat, 10:00 AM</p></div></div>
        </Widget>
        <Widget title="Collaborations" to="/app/collab">
          <div className="flex items-center gap-3"><Users size={18} className="text-sky-600" /><div><p className="text-sm font-medium">2 new matches for your project</p><p className="text-xs text-muted">Based on your skills</p></div></div>
        </Widget>
        <Widget title="Marketplace activity" to="/app/marketplace">
          <div className="flex items-center gap-3"><ShoppingBag size={18} className="text-sky-600" /><div><p className="text-sm font-medium">No active orders</p><p className="text-xs text-muted">Browse listings from your campus</p></div></div>
        </Widget>
      </div>
    </div>
  );
}
