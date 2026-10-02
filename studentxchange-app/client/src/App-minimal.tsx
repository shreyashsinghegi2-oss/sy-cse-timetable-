import { Switch, Route } from "wouter";
import { ErrorBoundary } from "./components/error-boundary";

function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">StudentXchange</h1>
        <p className="text-center text-gray-600">
          Student marketplace for educational materials
        </p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route>
        <div className="min-h-screen bg-white flex items-center justify-center">
          <h1 className="text-2xl">Page not found</h1>
        </div>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router />
    </ErrorBoundary>
  );
}

export default App;