package main

import (
	"bytes"
	"crypto/md5"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
)

var (
	tmpls *template.Template

	indexTmplCached *bytes.Buffer

	appEnv    = os.Getenv("APP_ENV")
	__dirname = mustString(filepath.Abs(filepath.Dir(os.Args[0])))
)

func init() {
	if appEnv == "" {
		appEnv = "development"
	}

	if appEnv != "development" {
		// precompile
		tmpls = template.Must(compileTemplates())
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "4000"
	}

	http.Handle("/assets/", http.StripPrefix("/assets/", http.FileServer(http.Dir(filepath.Join(__dirname, "assets")))))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" {
			handleRoot(w, r)
			return
		}
		http.NotFound(w, r)
	})

	log.Println(fmt.Sprintf("Server running at port %s (%s)", port, appEnv))
	if err := http.ListenAndServe(fmt.Sprintf(":%s", port), nil); err != nil {
		log.Fatal("Error: ", err)
	}
}

func handleRoot(w http.ResponseWriter, r *http.Request) {
	if appEnv == "development" || indexTmplCached == nil {
		// don't bother locking because that's more costly
		b := &bytes.Buffer{}

		if appEnv == "development" {
			// recompile template
			var err error
			tmpls, err = compileTemplates()
			if err != nil {
				log.Println("Error: Could not compile template:", err)
				http.Error(w, "500 internal server error", http.StatusInternalServerError)
				return
			}
		}

		if err := tmpls.ExecuteTemplate(b, "index.html.tmpl", nil); err != nil {
			log.Println("Error: Could not render template:", err)
			http.Error(w, "500 internal server error", http.StatusInternalServerError)
			return
		}
		indexTmplCached = b
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	w.WriteHeader(http.StatusOK)
	w.Write(indexTmplCached.Bytes())
}

func dirname() string {
	dir, err := filepath.Abs(filepath.Dir(os.Args[0]))
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(dir)
	return dir
}

func fileMd5(path string) ([]byte, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	h := md5.New()
	if _, err := io.Copy(h, f); err != nil {
		return nil, err
	}

	var r []byte
	return h.Sum(r), nil
}

func mustString(s string, err error) string {
	if err != nil {
		log.Fatal(err)
	}
	return s
}

func compileTemplates() (*template.Template, error) {
	funcMap := template.FuncMap{
		"appendMD5": func(path string) string {
			m, _ := fileMd5(filepath.Join(__dirname, path))
			return fmt.Sprintf("%s?v=%x", path, m)
		},
	}

	return template.New("main").Funcs(funcMap).ParseGlob(filepath.Join(__dirname, "templates", "*.html.tmpl"))
}
