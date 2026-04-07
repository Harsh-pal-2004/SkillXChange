export const createAvatarUrl = (name = "Skill Xchange User") => {
  const params = new URLSearchParams({
    name,
    background: "7c3aed",
    color: "ffffff",
    size: "128",
    bold: "true",
  });

  return `https://ui-avatars.com/api/?${params.toString()}`;
};
