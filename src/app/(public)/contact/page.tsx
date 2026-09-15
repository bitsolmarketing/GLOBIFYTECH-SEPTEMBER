import type { Metadata } from "next";
import { Phone, Mail, MessageCircle, MapPin, Clock } from "lucide-react";
import { PageHero } from "@/components/marketing/page-hero";
import { ContactForm } from "@/components/marketing/contact-form";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/config/site";

export const metadata: Metadata = buildMetadata({ title: "Contact", description: "Talk to Globify Tech admissions by phone, WhatsApp or email. Campus: Kohinoor Plaza, Jaranwala Road, Faisalabad.", path: "/contact" });

export default function ContactPage() {
  const wa = site.contact.whatsapp.replace(/[^0-9]/g, "");
  const items = [
    { icon: MessageCircle, label: "WhatsApp", value: site.contact.whatsapp, href: `https://wa.me/${wa}` },
    { icon: Phone, label: "Admissions", value: site.contact.admissionsPhone, href: `tel:${site.contact.admissionsPhone.replace(/\s/g, "")}` },
    { icon: Phone, label: "Course questions", value: site.contact.coursesPhone, href: `tel:${site.contact.coursesPhone.replace(/\s/g, "")}` },
    { icon: Mail, label: "Email", value: site.contact.email, href: `mailto:${site.contact.email}` },
    { icon: MapPin, label: "Campus", value: site.contact.address },
    { icon: Clock, label: "Hours", value: site.contact.hours },
  ];
  return (
    <>
      <PageHero eyebrow="Contact" title="Talk to a real person." description="Counsellors answer on WhatsApp within minutes during working hours. Walk-ins are welcome at the Faisalabad campus." crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <div className="container-x grid gap-10 py-12 md:py-16 lg:grid-cols-12">
        <div className="flex flex-col gap-4 lg:col-span-5">
          {items.map((i) => (
            <div key={i.label} className="flex items-start gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <i.icon className="size-5" />
              </span>
              <div>
                <p className="text-label text-fg-subtle">{i.label}</p>
                {i.href ? (
                  <a href={i.href} className="text-body font-medium text-fg hover:text-accent" target={i.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
                    {i.value}
                  </a>
                ) : (
                  <p className="text-body text-fg">{i.value}</p>
                )}
              </div>
            </div>
          ))}
          <iframe title="Globify Tech campus map" className="mt-4 aspect-[4/3] w-full rounded-2xl border border-border" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=Kohinoor+Plaza+Jaranwala+Road+Faisalabad&output=embed" />
        </div>
        <div className="lg:col-span-7">
          <ContactForm />
        </div>
      </div>
    </>
  );
}
