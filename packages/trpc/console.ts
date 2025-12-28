import prisma from "@quenti/prisma";

const usernameAvailable = async (username: string) => {
  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
    },
  });

  return !user;
};

export const importConsole = async (_path: string) => {
  return {
    usernameAvailable,
  };
};
