import { Link } from "react-router-dom";
import SectionHeader from "../../components/SectionHeader";
import { goaPackages } from "../../data/goaPackages";

const tourPackages = goaPackages.filter((p) => p.theme === "adventure" || p.id.includes("grand"));

export default function GoaTourPackages() {
  return (
    <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 sm:py-20 min-h-[55vh]">
      <SectionHeader
        as="h1"
        kicker="Goa Packages"
        title="Goa-Tour Packages"
        description="The complete Goa adventure: Dudhsagar Waterfalls jungle safari, North Goa beach buzz, and Palolem bay tranquility."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
        {tourPackages.map((pkg) => (
          <Link
            key={pkg.id}
            to={`/packages/${pkg.id}`}
            className="group flex flex-col rounded-2xl overflow-hidden border border-white/10 bg-ink-850/80 shadow-card hover:border-pp-accent/40 hover:-translate-y-1 transition duration-300"
          >
            <div className="h-48 w-full overflow-hidden bg-ink-800 relative">
              <img
                src={pkg.image}
                alt={pkg.name}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
              />
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 bg-ink-950/70 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded-full text-mist-100 text-[11px] font-semibold">
                {pkg.days} Days / {pkg.nights} Nights
              </span>
            </div>
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-display text-xl text-mist-100 mb-1">{pkg.name}</h3>
                <p className="text-sm text-mist-400 leading-relaxed mb-4">{pkg.subtitle}</p>
                <ul className="space-y-1.5 mb-5 text-xs text-mist-300">
                  {pkg.highlights.slice(0, 3).map((h, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-pp-accent shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between">
                <span className="text-sm font-bold text-pp-accent">{pkg.priceFrom}</span>
                <span className="text-pp-aqua text-xs font-bold uppercase tracking-wide group-hover:underline">
                  View Itinerary →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
