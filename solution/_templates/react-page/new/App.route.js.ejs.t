---
inject: true
before: Route Insertion Point
prepend: false
to: ui/App.js
---

          <Route path="/<%= h.changeCase.lower(name) %>">
            <<%= h.capitalize(name) %>Page />
          </Route>