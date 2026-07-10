import type { AppRoute } from "@/lib/routes";

type PlaceholderPageProps = {
  page: AppRoute;
  eyebrow?: string;
};

export function PlaceholderPage({ page, eyebrow = "Prototype" }: PlaceholderPageProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-cyan-700">
            {eyebrow}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950 sm:text-4xl">
            {page.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">
            {page.description}
          </p>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-amber-800">
            Prototype status
          </p>
          <p className="mt-4 text-sm leading-6 text-amber-950">{page.status}</p>
        </div>
      </div>
    </section>
  );
}
