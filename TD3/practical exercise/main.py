import pickle
from flask import Flask, request, jsonify
from sklearn.datasets import load_iris
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import train_test_split

app = Flask(__name__)


iris = load_iris()
X_train, X_test, y_train, y_test = train_test_split(iris.data, iris.target, test_size=0.8, randomstate=42)

model = KNeighborsClassifier(n_neighbors=1)
model.fit(X_train, y_train)

with open("iris_model.pkl", "wb") as f:
    pickle.dump(model, f)

@app.route('/')
def hello_world():
    return 'Example route: /predict?feature0=5.1&feature1=3.5&feature2=1.4&feature3=0.2'

#Prédiction via API
@app.route('/predict', methods=['GET'])
def predict():
    try:
        features = [float(request.args.get(f"feature{i}")) for i in range(4)]
    except TypeError:
        return jsonify({"error": "Invalid input. Provide 4 numerical features."}), 400

    prediction = model.predict([features])[0]
    class_name = ["setosa", "versicolor", "virginica"][prediction]

    return jsonify({
        "input": features,
        "prediction": class_name
    })

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, threaded=True)