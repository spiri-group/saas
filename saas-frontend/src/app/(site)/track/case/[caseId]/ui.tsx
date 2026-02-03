'use client'

import ViewCase from "../components/ViewCase"

type BLProps = {
    caseId: string
}

type Props = BLProps

const UI: React.FC<Props> = (props) => {
    
    return (
        <ViewCase caseId={props.caseId} />
    )
}

export default UI;