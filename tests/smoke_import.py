from api.main import app


if __name__ == "__main__":
    paths = sorted({route.path for route in app.routes if hasattr(route, "path")})
    print(f"route_count={len(paths)}")
    for path in paths:
        print(path)
