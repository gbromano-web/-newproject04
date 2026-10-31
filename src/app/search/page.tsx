import { MarketSearch, searchMetadata } from "@/components/ph/market-search";

export const generateMetadata = (props: PageProps<"/search">) => searchMetadata(props.searchParams, "PH");

export default function SearchPage(props: PageProps<"/search">) {
  return <MarketSearch searchParams={props.searchParams} country="PH" />;
}
