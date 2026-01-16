import algoliasearch
print(dir(algoliasearch))
try:
    from algoliasearch.search_client import SearchClient
    print("Import successful")
except ImportError as e:
    print(f"Import failed: {e}")
