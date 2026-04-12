import { MessageSquare } from "lucide-react";

const renderSkillTags = (skills, colorClasses, emptyLabel) => {
  if (!skills.length) {
    return <p className="text-xs text-gray-400">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span
          key={skill}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${colorClasses}`}
        >
          {skill}
        </span>
      ))}
    </div>
  );
};

export default function SkillMemberCard({
  name,
  username,
  avatar,
  bio,
  teachSkills,
  learnSkills,
  footerNote,
  onViewProfile,
  onMessage,
  messageLabel,
  extraAction = null,
}) {
  const avatarSrc =
    avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "Skill Xchange User")}`;

  return (
    <article className="flex h-full flex-col justify-between rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:scale-[1.01] hover:shadow-lg">
      <div className="space-y-4">
        <header className="flex items-center gap-3">
          <img
            src={avatarSrc}
            alt={`${name} avatar`}
            className="h-11 w-11 rounded-full bg-purple-100 object-cover"
          />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-gray-900">{name}</h3>
            <p className="truncate text-xs text-gray-400">@{username}</p>
          </div>
        </header>

        <section aria-label="Bio" className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
            Bio
          </p>
          <p className="min-h-[4.5rem] max-h-[4.5rem] overflow-hidden text-sm leading-6 text-gray-600">
            {bio}
          </p>
        </section>

        <section aria-label="Skills" className="space-y-3">
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Can Teach
            </p>
            {renderSkillTags(
              teachSkills,
              "bg-green-50 text-green-700",
              "No teaching skills added yet",
            )}
          </div>

          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Wants to Learn
            </p>
            {renderSkillTags(
              learnSkills,
              "bg-blue-50 text-blue-700",
              "No learning goals added yet",
            )}
          </div>
        </section>
      </div>

      <footer className="mt-5 border-t border-gray-100 pt-4">
        <p className="mb-3 text-xs text-gray-400">{footerNote}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onViewProfile}
            className="rounded-full border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
          >
            View Profile
          </button>
          <button
            onClick={onMessage}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-purple-200 text-purple-700 transition-colors hover:bg-purple-50"
            title={messageLabel}
            aria-label={messageLabel}
          >
            <MessageSquare size={15} />
          </button>
          {extraAction}
        </div>
      </footer>
    </article>
  );
}
