import SectionHeader from "../../components/SectionHeader";

const ITINERARIES = [
  {
    title: "Chardham Yatra",
    desc: "Yamunotri, Gangotri, Kedarnath, and Badrinath — the complete sacred Himalayan circuit.",
    href: "/itineraries/spiritual/chardham-yatra.html",
    image: "/itineraries/spiritual/images/Kedarnath.jpg",
  },
  {
    title: "Do Dham Yatra (Kedarnath & Badrinath)",
    desc: "Haridwar to the two most revered shrines in the Garhwal Himalayas.",
    href: "/itineraries/spiritual/dodham-yatra.html",
    image: "/itineraries/spiritual/images/Badrinath.webp",
  },
  {
    title: "Ek Dham Yatra (Kedarnath & Rishikesh)",
    desc: "Dedicated pilgrimage to Kedarnath with holy dip and Ganga Aarti at Rishikesh.",
    href: "/itineraries/spiritual/ekdham-yatra.html",
    image: "/itineraries/spiritual/images/GaurikundTrek.avif",
  },
  {
    title: "Teen Dham Yatra",
    desc: "Haridwar to Yamunotri, Gangotri, and Kedarnath circuit.",
    href: "/itineraries/spiritual/teendham-yatra.html",
    image: "/itineraries/spiritual/images/Gangotri.jpg",
  },
  {
    title: "Tungnath & Chandrashila Yatra",
    desc: "Sari, Deoria Tal, Chopta, highest Shiva temple Tungnath and Chandrashila summit.",
    href: "/itineraries/spiritual/tungnath-yatra.html",
    image: "/itineraries/spiritual/images/tugnath.webp",
  },
  {
    title: "Winter Char Dham Yatra",
    desc: "Visit the winter seats (Kharsali, Mukhba, Ukhimath, Joshimath) when high temples close.",
    href: "/itineraries/spiritual/winter-char-dham.html",
    image: "/itineraries/spiritual/images/UkhimathWinter.jpg",
  },
];

export default function SpiritualPackages() {
  return (
    <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-16 sm:py-20 min-h-[55vh]">
      <SectionHeader
        as="h1"
        kicker="Packages"
        title="Spiritual Packages"
        description="Char Dham circuits, temple towns, and pilgrimage-focused itineraries."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
        {ITINERARIES.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group flex flex-col rounded-2xl overflow-hidden border border-white/5 bg-ink-850 shadow-card hover:border-emerald-400/30 hover:-translate-y-1 transition duration-300"
          >
            <div className="h-40 w-full overflow-hidden bg-ink-800">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="p-5">
              <h3 className="font-serif text-lg text-mist-100 mb-2">{item.title}</h3>
              <p className="text-sm text-mist-400 leading-relaxed mb-4">{item.desc}</p>
              <span className="text-emerald-400 text-xs font-bold uppercase tracking-wide">
                Open interactive map →
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
