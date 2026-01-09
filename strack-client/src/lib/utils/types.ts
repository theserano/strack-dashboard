export interface ReduxAction {
  onSuccess?: (data: unknown) => void;
  onFailure?: (data: unknown) => void;
}
