import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import './App.css';
import HomePage from "./pages/homepage";
import VersionPage from "./pages/versionpage";
// Import Insertion Point (do not change this text, it is being used by hygen cli)

function App() {
  return (
      <Router>
        <Switch>

          {/* Route Insertion Point (do not change this text, it is being used by hygen cli) */}
          <Route path="/version">
            <VersionPage />
          </Route>
          <Route path="/">
            <HomePage />
          </Route>
        </Switch>
      </Router>
  );
}

export default App;
