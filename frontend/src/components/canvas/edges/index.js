import NetworkEdge from "./NetworkEdge";
import DataFlowEdge from "./DataFlowEdge";
import DependencyEdge from "./DependencyEdge";
import StreamingEdge from "./StreamingEdge";
import BatchEdge from "./BatchEdge";
import EventEdge from "./EventEdge";

export const edgeTypes = {
  network: NetworkEdge,
  data_flow: DataFlowEdge,
  dependency: DependencyEdge,
  streaming: StreamingEdge,
  batch: BatchEdge,
  event: EventEdge,
};
