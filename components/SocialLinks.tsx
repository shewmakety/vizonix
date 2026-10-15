import { socialProfiles } from "@/lib/site";

export function SocialLinks({ separator = " " }: { separator?: string }) {
  return (
    <>
      {socialProfiles.map((profile, index) => (
        <span key={profile.href}>
          {index > 0 ? separator : null}
          <a href={profile.href} rel="noopener noreferrer">
            {profile.name}
          </a>
        </span>
      ))}
    </>
  );
}
