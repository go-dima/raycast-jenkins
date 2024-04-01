// ParameterValue type
export type ParameterValue = {
  _class: string;
  name: string;
  value: string | boolean;
};

// ParameterDefinition type
export type ParameterDefinition = {
  _class: string;
  defaultParameterValue: ParameterValue;
  description: string;
  name: string;
  type: string;
  choices: string[];
};

// ParametersDefinitionProperty type
export type ParametersDefinitionProperty = {
  _class: string;
  parameterDefinitions: ParameterDefinition[];
};

// BranchJobProperty type
export type BranchJobProperty = {
  _class: string;
  branch: object;
};

// DisableConcurrentBuildsJobProperty type
export type DisableConcurrentBuildsJobProperty = {
  _class: string;
};

// Union type for all possible types
export type PropertyType = BranchJobProperty | DisableConcurrentBuildsJobProperty | ParametersDefinitionProperty;

export const ParameterTypeValues = {
  Boolean: "BooleanParameterDefinition",
  String: "StringParameterDefinition",
  Choice: "ChoiceParameterDefinition",
} as const;

export type ParameterType = keyof typeof ParameterTypeValues;
