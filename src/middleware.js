export function combineMiddleware(outer, inner) {
  return function middleware(dispatch) {
    return outer(inner(dispatch));
  };
}
