import { LucideLoader2, LucideProps } from "lucide-react"

const Spinner: React.FC<LucideProps> = (props) => {
    return <LucideLoader2 className="animate-spin" {...props} />
}

export default Spinner;