import { SkyHero } from './sky/SkyHero';

export function ComingSoon({ title, heading, text }: { title: string; heading: string; text: string }) {
  return (
    <>
      <SkyHero time="morning" title={title} />
      <div className="mx-auto max-w-[1240px] px-4 pt-12 sm:px-8">
        <div className="kt-reveal panel max-w-[640px] p-7">
          <p className="eyebrow m-0">{heading}</p>
          <p className="m-0 mt-3 text-[17px] text-ink/70">{text}</p>
        </div>
      </div>
    </>
  );
}
