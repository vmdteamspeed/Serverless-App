---
to: "ui/src/pages/<%= h.changeCase.lower(name) %>page.js"
---
import React from "react";

const <%= h.capitalize(name) %>Page = () =>{
    return(
        <div>
            Welcome to the <%= name %> Page!!!
        </div>
    )
}

export default <%= h.capitalize(name) %>Page