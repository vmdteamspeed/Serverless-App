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

function App() {
  return (
      <Router>
        <Switch>
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
