import { useClientData } from "@/hooks/use-client-data";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntl } from "react-intl";
import { Users, Map, UserMinus } from "lucide-react";

export function LiveStats() {
  const intl = useIntl();
  const { clientStats, isLoading } = useClientData();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: intl.formatMessage({ id: "stats.activeListeners" }),
      value: clientStats.activeListeners,
      icon: Users,
    },
    {
      label: intl.formatMessage({ id: "stats.geotaggedListeners" }),
      value: clientStats.geotaggedListeners,
      icon: Map,
    },
    {
      label: intl.formatMessage({ id: "stats.anonymousListeners" }),
      value: clientStats.anonymousListeners,
      icon: UserMinus,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {stats.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="p-4 rounded-lg border bg-card text-card-foreground"
        >
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium">{label}</p>
          </div>
          <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
      ))}
    </div>
  );
}
