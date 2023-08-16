// NOTE This variable is kept in a separate file to prevent cyclic dependencies between different migration helpers

export const hasDebugEnvVariable = Boolean(process.env.SESSION_DEBUG);
