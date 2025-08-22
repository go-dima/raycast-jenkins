import { Action, ActionPanel, Form, popToRoot } from "@raycast/api";
import { ReactElement } from "react";
import { ExtraInfo, JobResult } from "./job.types";
import { ParameterDefinition, ParameterTypeValues, ParametersDefinitionProperty } from "./property.types";
import { buildWithParameters } from "./http/http";

type FormProps = {
  job: JobResult;
  jobInfo: ExtraInfo;
};

export function JobForm({ job, jobInfo }: FormProps) {
  const parameters = jobInfo?.property?.find(
    (prop) => prop._class === "hudson.model.ParametersDefinitionProperty"
  ) as ParametersDefinitionProperty;

  return (
    <Form
      navigationTitle={`${jobInfo?.displayName ?? job.name.toString()}`}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Build"
            onSubmit={async (values): Promise<void> => {
              await buildWithParameters(job.url, values, job.name, jobInfo?.displayName ?? job.name);
              popToRoot();
            }}
          />
        </ActionPanel>
      }
    >
      {parameters?.parameterDefinitions.map(parameterToFormItem)}
    </Form>
  );
}

const parameterToFormItem = (param: ParameterDefinition): ReactElement => {
  switch (param.type as string) {
    case ParameterTypeValues.Boolean:
      return (
        <Form.Checkbox
          id={param.name}
          key={param.name}
          label={param.name}
          defaultValue={!!param.defaultParameterValue.value}
          info={param.description}
        />
      );
    case ParameterTypeValues.String:
      return (
        <Form.TextField
          id={param.name}
          key={param.name}
          title={param.name}
          placeholder={param.defaultParameterValue.value as string}
          defaultValue={`${param.defaultParameterValue.value}`}
          info={param.description}
        />
      );
    case ParameterTypeValues.Choice:
      return (
        <Form.Dropdown
          id={param.name}
          key={param.name}
          title={param.name}
          defaultValue={param.defaultParameterValue.value as string}
          info={param.description}
        >
          {param.choices.map((choice) => (
            <Form.Dropdown.Item key={choice} title={choice} value={choice} />
          ))}
        </Form.Dropdown>
      );
    default:
      return <Form.TextField id={param.name} key={param.name} info={param.description} placeholder="Unknown" />;
  }
};
