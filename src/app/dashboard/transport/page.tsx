import { getTransportRoutes, getTransportSubscriptions } from "@/domains/transport/actions/transport.actions";
import TransportClient from "./TransportClient";

export default async function TransportPage() {
  const routesRes = await getTransportRoutes() as any;
  const routes = routesRes.data?.data || routesRes.data || [];
  
  const subsRes = await getTransportSubscriptions() as any;
  const subs = subsRes.data?.data || subsRes.data || [];

  return (
    <TransportClient 
      initialRoutes={routes} 
      initialSubscriptions={subs} 
    />
  );
}
