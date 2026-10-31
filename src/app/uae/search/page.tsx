import { MarketSearch, searchMetadata } from "@/components/ph/market-search";

export const generateMetadata = (props: PageProps<"/uae/search">) => searchMetadata(props.searchParams, "AE");

export default function UaeSearchPage(props: PageProps<"/uae/search">) {
  return <MarketSearch searchParams={props.searchParams} country="AE" />;
}
