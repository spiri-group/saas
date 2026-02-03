import { CreateHelpRequestButton } from "../components/HelpRequest"
import CatalogueItems from "../components/Home/CatalogueItems"

export default async function SearchPage() {
  return (
    <div className="animate-page-fade-in">
      <CatalogueItems 
        frontItems={[
          <CreateHelpRequestButton  
            key={"help-request-button"}
          />
      ]} />
    </div>
  ) 
}
