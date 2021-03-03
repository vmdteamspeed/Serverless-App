import {buildDate, buildId} from "../helpers/settings";

const VersionPage = () =>{
    return(
        <div>
            <h1>Built on {buildDate}</h1>
            <h1>Build ID: {buildId}</h1>
        </div>
    )
}

export default VersionPage